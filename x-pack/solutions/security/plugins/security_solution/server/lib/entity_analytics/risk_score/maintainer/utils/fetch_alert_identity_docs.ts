/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { euid } from '@kbn/entity-store/common/euid_helpers';
import type { EntityType } from '../../../../../../common/entity_analytics/types';
import type { ScopedLogger } from './with_log_context';

interface FetchAlertIdentityDocsParams {
  esClient: ElasticsearchClient;
  entityType: EntityType;
  alertsIndex: string;
  alertFilters: QueryDslQueryContainer[];
  /** EUIDs (`entity_id`) that scored in this page but have no entity store record. */
  euids: string[];
  logger: ScopedLogger;
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
 * Fetches the full `_source` (not a trimmed field list): the creation policy's field
 * evaluations (e.g. the user `entity.namespace` derivation) read fields beyond the identity
 * composition itself (`event.kind`, `event.category`, `event.type`, `cloud.provider`, ...), and
 * a partial document risks misclassifying an IdP alert as local. The number of documents
 * fetched is bounded by the page's missing-EUID count, not by document size.
 */
export const fetchAlertIdentityDocs = async ({
  esClient,
  entityType,
  alertsIndex,
  alertFilters,
  euids,
  logger,
}: FetchAlertIdentityDocsParams): Promise<Map<string, Record<string, unknown>>> => {
  const result = new Map<string, Record<string, unknown>>();
  if (euids.length === 0) {
    return result;
  }

  const runtimeMapping = euid.painless.getEuidRuntimeMapping(entityType);

  try {
    const response = await esClient.search({
      index: alertsIndex,
      size: 0,
      runtime_mappings: { entity_id: runtimeMapping },
      query: {
        bool: {
          filter: [...alertFilters, { terms: { entity_id: euids } }],
        },
      },
      aggs: {
        by_entity_id: {
          terms: { field: 'entity_id', size: euids.length },
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
    });

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
      `Failed to fetch representative alert documents for ${euids.length} missing ` +
        `${entityType} entities: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return result;
};
