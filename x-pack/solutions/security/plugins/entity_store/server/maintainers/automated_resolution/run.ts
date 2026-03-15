/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { ENTITY_ID_FIELD } from '../../../common/domain/definitions/common_fields';
import { getFieldValue } from '../../../common/domain/euid/commons';
import type { EntityMaintainerStatus } from '../../tasks/entity_maintainers/types';
import type { ResolutionClient } from '../../domain/resolution/resolution_client';
import { getLatestEntitiesIndexName } from '../../domain/asset_manager/latest_index';
import type { AutomatedResolutionState, MatchBucket, EntityHit } from './types';

const MATCH_FIELD = 'user.email';
const ENTITY_TYPE = 'user';
const SOURCE_PRIORITY = [
  'entityanalytics_ad',
  'entityanalytics_okta',
  'okta',
  'entityanalytics_entra_id',
  'azure',
];
const PAGE_SIZE = 10_000;
const TOP_HITS_SIZE = 100;
const RESOLVED_TO_FIELD = 'entity.relationships.resolution.resolved_to';
const ENGINE_METADATA_TYPE_FIELD = 'entity.EngineMetadata.Type';
const ENTITY_SOURCE_FIELD = 'entity.source';

interface RunAutomatedResolutionOpts {
  status: EntityMaintainerStatus;
  esClient: ElasticsearchClient;
  resolutionClient: ResolutionClient;
  logger: Logger;
  abortController: AbortController;
}

/**
 * Automated entity resolution: links user entities sharing the same user.email.
 *
 * 1. Collect email values from new unresolved user entities (composite agg, paginated)
 * 2. Find matching groups — emails shared by 2+ entities (terms agg, batched)
 * 3. Resolve — extend existing groups or create new ones via ResolutionClient
 * 4. Update state — advance watermark, store stats
 */
export const runAutomatedResolution = async ({
  status,
  esClient,
  resolutionClient,
  logger,
  abortController,
}: RunAutomatedResolutionOpts): Promise<AutomatedResolutionState> => {
  const state = status.state as AutomatedResolutionState;
  const { namespace } = status.metadata;
  const index = getLatestEntitiesIndexName(namespace);
  const watermark = state.lastProcessedTimestamp;

  // Step 1: Collect new email values
  const { values, maxTimestamp } = await collectEmailValues({
    esClient,
    index,
    watermark,
    logger,
  });

  if (values.length === 0) {
    logger.debug('No new entities to process');
    return {
      ...state,
      lastRun: {
        newValuesScanned: 0,
        matchGroupsFound: 0,
        resolutionsCreated: 0,
        skippedAmbiguousBuckets: 0,
        timestamp: new Date().toISOString(),
      },
    };
  }

  if (abortController.signal.aborted) {
    logger.warn('Aborted after Step 1');
    return state;
  }

  // Step 2: Find matching groups
  const buckets = await findMatchingGroups({ esClient, index, values, logger });

  if (abortController.signal.aborted) {
    logger.warn('Aborted after Step 2');
    return state;
  }

  // Step 3: Resolve
  const { resolutionsCreated, skippedAmbiguousBuckets } = await applyResolutions({
    buckets,
    resolutionClient,
    logger,
  });

  // Step 4: Update state
  logger.info(
    `Scanned ${values.length} values, found ${buckets.length} groups, created ${resolutionsCreated} resolutions`
  );

  return {
    lastProcessedTimestamp: maxTimestamp,
    totalResolutionsCreated: state.totalResolutionsCreated + resolutionsCreated,
    lastRun: {
      newValuesScanned: values.length,
      matchGroupsFound: buckets.length,
      resolutionsCreated,
      skippedAmbiguousBuckets,
      timestamp: new Date().toISOString(),
    },
  };
};

// ---------------------------------------------------------------------------
// Step 1: Collect email values from new unresolved user entities
// ---------------------------------------------------------------------------

interface CollectEmailValuesResult {
  values: string[];
  maxTimestamp: string;
}

const collectEmailValues = async ({
  esClient,
  index,
  watermark,
  logger,
}: {
  esClient: ElasticsearchClient;
  index: string;
  watermark: string | null;
  logger: Logger;
}): Promise<CollectEmailValuesResult> => {
  const filters: QueryDslQueryContainer[] = [
    { term: { [ENGINE_METADATA_TYPE_FIELD]: ENTITY_TYPE } },
    { exists: { field: MATCH_FIELD } },
    { bool: { must_not: [{ exists: { field: RESOLVED_TO_FIELD } }] } },
    {
      script: {
        script: { source: `doc['${MATCH_FIELD}'].size() == 1`, lang: 'painless' },
      },
    },
  ];

  if (watermark) {
    filters.push({ range: { '@timestamp': { gt: watermark } } });
  }

  const allValues: string[] = [];
  let overallMaxTimestamp: string | null = null;
  let afterKey: Record<string, string> | undefined;

  do {
    const response = await esClient.search({
      index,
      size: 0,
      query: { bool: { filter: filters } },
      aggs: {
        email_values: {
          composite: {
            sources: [{ email: { terms: { field: MATCH_FIELD } } }],
            size: PAGE_SIZE,
            ...(afterKey ? { after: afterKey } : {}),
          },
        },
        max_timestamp: { max: { field: '@timestamp' } },
      },
    });

    const compositeAgg = response.aggregations?.email_values as
      | { buckets: Array<{ key: { email: string } }>; after_key?: { email: string } }
      | undefined;

    const maxTimestampAgg = response.aggregations?.max_timestamp as
      | { value_as_string?: string }
      | undefined;

    if (maxTimestampAgg?.value_as_string && !overallMaxTimestamp) {
      overallMaxTimestamp = maxTimestampAgg.value_as_string;
    }

    const buckets = compositeAgg?.buckets ?? [];
    for (const bucket of buckets) {
      allValues.push(bucket.key.email);
    }

    afterKey = compositeAgg?.after_key as Record<string, string> | undefined;
  } while (afterKey);

  logger.debug(
    `Step 1: found ${allValues.length} email values` +
      (watermark ? ` (since ${watermark})` : ' (full scan)')
  );

  return {
    values: allValues,
    maxTimestamp: overallMaxTimestamp ?? new Date().toISOString(),
  };
};

// ---------------------------------------------------------------------------
// Step 2: Find matching groups (batched)
// ---------------------------------------------------------------------------

const findMatchingGroups = async ({
  esClient,
  index,
  values,
  logger,
}: {
  esClient: ElasticsearchClient;
  index: string;
  values: string[];
  logger: Logger;
}): Promise<MatchBucket[]> => {
  const allBuckets: MatchBucket[] = [];

  for (let i = 0; i < values.length; i += PAGE_SIZE) {
    const batch = values.slice(i, i + PAGE_SIZE);

    const batchFilters: QueryDslQueryContainer[] = [
      { term: { [ENGINE_METADATA_TYPE_FIELD]: ENTITY_TYPE } },
      { terms: { [MATCH_FIELD]: batch } },
      {
        script: {
          script: { source: `doc['${MATCH_FIELD}'].size() == 1`, lang: 'painless' },
        },
      },
    ];

    const response = await esClient.search({
      index,
      size: 0,
      query: { bool: { filter: batchFilters } },
      aggs: {
        match_groups: {
          terms: { field: MATCH_FIELD, min_doc_count: 2, size: PAGE_SIZE },
          aggs: {
            unresolved: {
              filter: {
                bool: { must_not: [{ exists: { field: RESOLVED_TO_FIELD } }] },
              },
              aggs: {
                entities: {
                  top_hits: {
                    size: TOP_HITS_SIZE,
                    _source: [ENTITY_ID_FIELD, ENTITY_SOURCE_FIELD],
                  },
                },
              },
            },
            existing_targets: {
              filter: { exists: { field: RESOLVED_TO_FIELD } },
              aggs: {
                resolved_to_values: {
                  terms: { field: RESOLVED_TO_FIELD, size: PAGE_SIZE },
                },
              },
            },
          },
        },
      },
    });

    const rawBuckets =
      (
        response.aggregations?.match_groups as {
          buckets?: Array<{
            key: string;
            unresolved: {
              entities: { hits: { hits: Array<{ _source: Record<string, unknown> }> } };
            };
            existing_targets: {
              resolved_to_values: { buckets: Array<{ key: string }> };
            };
          }>;
        }
      )?.buckets ?? [];

    for (const bucket of rawBuckets) {
      const unresolved: EntityHit[] = bucket.unresolved.entities.hits.hits.map((hit) => ({
        id: getFieldValue(hit._source, ENTITY_ID_FIELD) ?? '',
        source: getFieldValue(hit._source, ENTITY_SOURCE_FIELD) ?? '',
      }));

      const existingTargetIds = bucket.existing_targets.resolved_to_values.buckets.map(
        (b) => b.key
      );

      allBuckets.push({ key: bucket.key, unresolved, existingTargetIds });
    }
  }

  logger.debug(`Step 2: found ${allBuckets.length} matching groups from ${values.length} values`);

  return allBuckets;
};

// ---------------------------------------------------------------------------
// Step 3: Apply resolutions
// ---------------------------------------------------------------------------

const applyResolutions = async ({
  buckets,
  resolutionClient,
  logger,
}: {
  buckets: MatchBucket[];
  resolutionClient: ResolutionClient;
  logger: Logger;
}): Promise<{ resolutionsCreated: number; skippedAmbiguousBuckets: number }> => {
  let resolutionsCreated = 0;
  let skippedAmbiguousBuckets = 0;

  for (const bucket of buckets) {
    const { unresolved, existingTargetIds, key } = bucket;

    let targetId: string;

    if (existingTargetIds.length === 1) {
      targetId = existingTargetIds[0];
    } else if (existingTargetIds.length === 0 && unresolved.length >= 2) {
      targetId = selectTarget(unresolved);
    } else if (existingTargetIds.length > 1) {
      logger.warn(
        `Bucket "${key}": ${existingTargetIds.length} existing targets — skipping (group merge not supported)`
      );
      skippedAmbiguousBuckets++;
      continue;
    } else {
      continue;
    }

    const aliasIds = unresolved.filter((e) => e.id !== targetId).map((e) => e.id);

    if (aliasIds.length === 0) {
      continue;
    }

    try {
      const result = await resolutionClient.linkEntities(targetId, aliasIds);
      resolutionsCreated += result.linked.length;

      if (result.linked.length > 0) {
        logger.info(
          `Linked ${result.linked.length} entities to target "${targetId}" (email: "${key}")`
        );
      }
    } catch (err) {
      logger.warn(
        `Failed to link group for target "${targetId}" (email: "${key}"): ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }

  return { resolutionsCreated, skippedAmbiguousBuckets };
};

// ---------------------------------------------------------------------------
// Target selection: prefer_source with alphabetical tiebreaker
// ---------------------------------------------------------------------------

export const selectTarget = (entities: EntityHit[]): string => {
  for (const sourceKey of SOURCE_PRIORITY) {
    const fromSource = entities.filter((e) => e.source.includes(sourceKey));
    if (fromSource.length > 0) {
      return [...fromSource].sort((a, b) => a.id.localeCompare(b.id))[0].id;
    }
  }
  return [...entities].sort((a, b) => a.id.localeCompare(b.id))[0].id;
};
