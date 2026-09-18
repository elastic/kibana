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
import { isEntityTypeCreatableFromSingleDocument } from '@kbn/entity-store/server';
import type { EntityType } from '../../../../../../common/entity_analytics/types';
import type { ScopedLogger } from './with_log_context';

/** Bounds each `terms`/`top_hits` request; chunks are sequential to limit in-flight responses. */
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

export interface AlertIdentityDoc {
  source: Record<string, unknown>;
  /** Earliest matching alert timestamp; an upper bound on the entity's true first-seen. */
  firstSeen?: string;
}

/** Fetches the latest non-failure alert and window-bounded first-seen per EUID under base-scoring identity semantics; non-creatable types return no documents. */
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
  if (euids.length === 0 || !isEntityTypeCreatableFromSingleDocument(entityType)) {
    return result;
  }

  // Keep this runtime mapping and `alertFilters` aligned with base scoring so each bucket
  // legitimately computes its requested EUID.
  // TODO: Reconsider this coupling after elastic/security-team#18624 is resolved.
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
                    // Creation policy does not read these large fields; exclude them to reduce
                    // each bucket's source.
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
