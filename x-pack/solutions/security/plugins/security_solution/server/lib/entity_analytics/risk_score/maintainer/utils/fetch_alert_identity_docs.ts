/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { euid } from '@kbn/entity-store/common/euid_helpers';
import { isEntityTypeCreatableFromDocument } from '@kbn/entity-store/server';
import type { EntityType } from '../../../../../../common/entity_analytics/types';
import type { ScopedLogger } from './with_log_context';

/**
 * Upper bound on EUIDs looked up per `_search` request: each one becomes a `terms` agg bucket
 * with its own full-`_source` `top_hits`, so an unbounded request scales with a whole page's
 * missing-EUID count (`DEFAULT_RISK_SCORE_PAGE_SIZE` is 10,000). Chunks are fetched sequentially,
 * not in parallel, to keep at most one such request in flight.
 */
export const ALERT_IDENTITY_DOCS_CHUNK_SIZE = 500;

interface FetchAlertIdentityDocsParams {
  esClient: ElasticsearchClient;
  entityType: EntityType;
  alertsIndex: string;
  alertFilters: QueryDslQueryContainer[];
  /** EUIDs (`entity_id`) that scored in this page but have no entity store record. */
  euids: string[];
  logger: ScopedLogger;
  abortSignal?: AbortSignal;
}

interface EuidTermsAggBucket {
  key: string;
  latest: {
    hits: {
      hits: Array<{ _source?: Record<string, unknown> }>;
    };
  };
  first_seen: {
    value_as_string?: string;
  };
}

/** One missing EUID's representative alert, plus the earliest qualifying alert timestamp seen for it. */
export interface AlertIdentityDoc {
  source: Record<string, unknown>;
  /**
   * Earliest `@timestamp` seen for this EUID among alerts matching `alertFilters` — an upper
   * bound on the entity's true first-seen, not the true value. See the `firstSeen` rationale on
   * {@link buildEntityFromSource} for why that approximation is an acceptable, recoverable trade
   * rather than a silent inaccuracy.
   */
  firstSeen?: string;
}

/**
 * Fetches one representative alert `_source` per missing EUID, to drive the create-if-missing
 * policy (`getEntityCreationCandidate`).Excludes `event.outcome: failure` from the `top_hits` selection
 *
 * Reuses the same `entity_id` Painless runtime mapping and `alertFilters` as
 * `getEuidCompositeQuery` so the `terms` filter below only matches documents that would
 * legitimately compute one of the requested EUIDs. TODO: Reconsider this once elastic/security-team#18624 is resolved.
 *
 * Requests are chunked to {@link ALERT_IDENTITY_DOCS_CHUNK_SIZE} EUIDs, so the number of
 * documents fetched per request is bounded independently of the page's missing-EUID count.
 *
 * Also collects, per EUID, the earliest `@timestamp` among matching alerts (`first_seen` sub-agg)
 * to seed `entity.lifecycle.first_seen` on creation — see the `firstSeen` field on {@link AlertIdentityDoc} for the caveat on what that value actually represents.
 *
 * Skips the query entirely for an entity type with no `creatableFromDocument` (currently `generic`)
 */
export const fetchAlertIdentityDocs = async ({
  esClient,
  entityType,
  alertsIndex,
  alertFilters,
  euids,
  logger,
  abortSignal,
}: FetchAlertIdentityDocsParams): Promise<Map<string, AlertIdentityDoc>> => {
  const result = new Map<string, AlertIdentityDoc>();
  if (euids.length === 0 || !isEntityTypeCreatableFromDocument(entityType)) {
    return result;
  }

  const runtimeMapping = euid.painless.getEuidRuntimeMapping(entityType);

  for (const euidsChunk of chunk(euids, ALERT_IDENTITY_DOCS_CHUNK_SIZE)) {
    if (abortSignal?.aborted) {
      logger.info('Representative alert document fetch aborted between chunks');
      return result;
    }

    try {
      const response = await esClient.search(
        {
          index: alertsIndex,
          size: 0,
          runtime_mappings: { entity_id: runtimeMapping },
          query: {
            bool: {
              filter: [...alertFilters, { terms: { entity_id: euidsChunk } }],
              must_not: [{ term: { 'event.outcome': 'failure' } }],
            },
          },
          aggs: {
            by_entity_id: {
              terms: { field: 'entity_id', size: euidsChunk.length },
              aggs: {
                latest: {
                  top_hits: {
                    size: 1,
                    sort: [{ '@timestamp': { order: 'desc' } }],
                    // 500 buckets each carrying a full alert `_source` can be a multi-MB
                    // response. None of the creation policy's field evaluations read these
                    // paths, so excluding them shrinks the response without changing what the
                    // policy sees.
                    _source: {
                      excludes: [
                        'kibana.alert.rule.parameters',
                        'kibana.alert.ancestors',
                        'kibana.alert.original_event',
                        'kibana.alert.rule.execution.*',
                      ],
                    },
                  },
                },
                first_seen: { min: { field: '@timestamp' } },
              },
            },
          },
        },
        { signal: abortSignal }
      );

      const buckets =
        (response.aggregations as { by_entity_id?: { buckets: EuidTermsAggBucket[] } } | undefined)
          ?.by_entity_id?.buckets ?? [];

      for (const bucket of buckets) {
        const source = bucket.latest.hits.hits[0]?._source;
        if (source) {
          result.set(bucket.key, { source, firstSeen: bucket.first_seen.value_as_string });
        }
      }
    } catch (error) {
      logger.warn(
        `Failed to fetch representative alert documents for ${euidsChunk.length} of ` +
          `${euids.length} missing ${entityType} entities: ` +
          `${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return result;
};
