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
}

/**
 * Fetches one representative alert `_source` per missing EUID, to drive the create-if-missing
 * policy (`getEntityCreationCandidate`). The maintainer's own EUID can't be trusted for gating
 * (the ES|QL base-scoring query applies only `documentsFilter`, not `postAggFilter` — see
 * `score_base_entities.ts`), so creation re-derives everything (namespace, identity fields,
 * `event.outcome`) from a real source document rather than the composite-agg's bucket key.
 *
 * Reuses the same `entity_id` Painless runtime mapping and `alertFilters` as
 * `getEuidCompositeQuery` so the `terms` filter below only matches documents that would
 * legitimately compute one of the requested EUIDs.
 *
 * Excludes `event.outcome: failure` from the `top_hits` selection itself: without this, the
 * single newest alert per EUID could be a failure alert even when an older, eligible alert for
 * the same EUID exists, which would make `getEntityCreationCandidate` reject a candidate that
 * should have been accepted. The in-memory policy check in `getEntityCreationCandidate` stays as
 * the authoritative gate — this query filter is only an optimization of the selection.
 *
 * Fetches the full `_source` (not a trimmed field list): the creation policy's field
 * evaluations (e.g. the user `entity.namespace` derivation) read fields beyond the identity
 * composition itself (`event.kind`, `event.category`, `event.type`, `cloud.provider`, ...), and
 * a partial document risks misclassifying an IdP alert as local. Requests are chunked to
 * {@link ALERT_IDENTITY_DOCS_CHUNK_SIZE} EUIDs each (see that constant), so the number of
 * documents fetched per request is bounded independently of the page's missing-EUID count.
 *
 * Skips the query entirely for an entity type with no `creatableFromDocument` (currently
 * `generic`): every candidate would be rejected with `entity_type_not_creatable` regardless of
 * the source document, so fetching one is wasted work.
 */
export const fetchAlertIdentityDocs = async ({
  esClient,
  entityType,
  alertsIndex,
  alertFilters,
  euids,
  logger,
  abortSignal,
}: FetchAlertIdentityDocsParams): Promise<Map<string, Record<string, unknown>>> => {
  const result = new Map<string, Record<string, unknown>>();
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
                  },
                },
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
          result.set(bucket.key, source);
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
