/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { QueryDslQueryContainer, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { EntityType } from '../../../../../../common/entity_analytics/types';
import { ALERT_ENTITY_ID } from '../../../../../../common/field_maps/field_names';
import { RISK_SCORING_REQUEST_TIMEOUT } from '../../constants';

export interface SampledPagesConfig {
  /** Entities per page to aim for; below the scoring query's row limit, so pages rarely reach it. */
  targetPageSize: number;
  /** Sampled entity IDs per page: more gives evener pages for a costlier sample. */
  samplesPerPage: number;
  seed?: number;
}

export interface SampledPageBounds {
  /** Inclusive upper bounds of every page but the last, which runs to the end of the type's IDs. */
  uppers: string[];
  /** Every sampled entity ID in order, kept to split a page that turns out too big. */
  sampledKeys: string[];
  entities: number;
  alerts: number;
  probability: number;
  countTookMs: number;
  sampleTookMs: number;
  sampleRequests: number;
}

export const DEFAULT_SAMPLE_SEED = 42;
const COMPOSITE_PAGE_SIZE = 10_000;

/** Sorts after every ID of the type, so it can close the last page's range. */
export const typeIdsEnd = (entityType: EntityType): string => `${entityType};`;

/**
 * The probability that gives each page about `samplesPerPage` sampled entities. Sampling picks
 * alerts, and an entity is picked through any of its alerts, so the number of entities sampled is
 * at least `p` times the entity count; it never exceeds 0.03 for the defaults, under the 0.5 cap.
 */
export const samplingProbability = ({
  entities,
  alerts,
  targetPageSize,
  samplesPerPage,
}: {
  entities: number;
  alerts: number;
  targetPageSize: number;
  samplesPerPage: number;
}): number => Math.min(0.49, ((samplesPerPage / targetPageSize) * entities) / Math.max(alerts, 1));

/**
 * Page upper bounds from the ordered sample: every `n`-th sampled ID, where `n` sampled IDs stand
 * for `targetPageSize` entities. The pages always cover every ID, whatever the sample looks like;
 * the sample only decides how even they are.
 */
export const boundsFromSample = (
  sampledKeys: string[],
  entities: number,
  targetPageSize: number
): string[] => {
  if (entities <= targetPageSize || sampledKeys.length === 0) {
    return [];
  }
  const keysPerPage = (sampledKeys.length * targetPageSize) / entities;
  const uppers: string[] = [];
  for (let position = keysPerPage; position < sampledKeys.length; position += keysPerPage) {
    const key = sampledKeys[Math.max(0, Math.round(position) - 1)];
    if (key !== uppers[uppers.length - 1]) {
      uppers.push(key);
    }
  }
  return uppers;
};

const firstAbove = (keys: string[], value: string | undefined): number => {
  if (value === undefined) {
    return 0;
  }
  let lo = 0;
  let hi = keys.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (keys[mid] <= value) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
};

/**
 * The sampled ID that halves the page `(lower, upper]`, or undefined when the page holds too few
 * sampled IDs to split it into two non-empty halves.
 */
export const splitPoint = (
  sampledKeys: string[],
  bounds: { lower?: string; upper: string }
): string | undefined => {
  const from = firstAbove(sampledKeys, bounds.lower);
  const pastUpper = firstAbove(sampledKeys, bounds.upper);
  // Only IDs strictly below the upper bound can split the page into two non-empty halves.
  const to =
    pastUpper > from && sampledKeys[pastUpper - 1] === bounds.upper ? pastUpper - 1 : pastUpper;
  if (to - from < 1) {
    return undefined;
  }
  return sampledKeys[from + Math.floor((to - from - 1) / 2)];
};

interface SampleAggregations {
  sample: {
    keys: {
      buckets: Array<{ key: { entity_id: string } }>;
      after_key?: { entity_id: string };
    };
  };
}

/**
 * Samples the alerts once at the start of the stage and derives every page's bounds, instead of
 * scanning every alert for each page. Counts the type's entities with alerts first (ES|QL expands
 * the stamped field, which holds every type's ID, and keeps this type's), then pages through one
 * random sample of alerts with a composite aggregation, which returns its IDs in order with no cap
 * on how many.
 */
export const sampleBasePageBounds = async ({
  esClient,
  entityType,
  alertFilters,
  alertsIndex,
  config,
}: {
  esClient: ElasticsearchClient;
  entityType: EntityType;
  alertFilters: QueryDslQueryContainer[];
  alertsIndex: string;
  config: SampledPagesConfig;
}): Promise<SampledPageBounds> => {
  const prefix = `${entityType}:`;
  const query: QueryDslQueryContainer = {
    bool: { filter: [...alertFilters, { prefix: { [ALERT_ENTITY_ID]: prefix } }] },
  };

  // The entity type is one of a fixed set of names, so it is safe in the query text. Each alert
  // holds at most one ID per type, so the rows left after the prefix filter count its alerts.
  const countResponse = await esClient.esql.query(
    {
      query: `FROM ${alertsIndex}
        | KEEP ${ALERT_ENTITY_ID}
        | MV_EXPAND ${ALERT_ENTITY_ID}
        | WHERE STARTS_WITH(${ALERT_ENTITY_ID}, "${prefix}")
        | STATS entities = COUNT_DISTINCT(${ALERT_ENTITY_ID}, 40000), alerts = COUNT(*)`,
      filter: query,
    },
    { requestTimeout: RISK_SCORING_REQUEST_TIMEOUT }
  );
  const countColumns = countResponse.columns.map(({ name }) => name);
  const [countRow = []] = countResponse.values;
  const countValue = (name: string): number => {
    const value = countRow[countColumns.indexOf(name)];
    return typeof value === 'number' ? value : 0;
  };
  const entities = countValue('entities');
  const alerts = countValue('alerts');
  const probability = samplingProbability({ entities, alerts, ...config });

  const sampledKeys: string[] = [];
  let sampleTookMs = 0;
  let sampleRequests = 0;
  let after: { entity_id: string } | undefined = { entity_id: prefix };
  while (entities > config.targetPageSize && after) {
    const response: SearchResponse<unknown, SampleAggregations> = await esClient.search<
      unknown,
      SampleAggregations
    >(
      {
        index: alertsIndex,
        ignore_unavailable: true,
        size: 0,
        track_total_hits: false,
        query,
        aggs: {
          sample: {
            random_sampler: { probability, seed: config.seed ?? DEFAULT_SAMPLE_SEED },
            aggs: {
              keys: {
                composite: {
                  size: COMPOSITE_PAGE_SIZE,
                  sources: [{ entity_id: { terms: { field: ALERT_ENTITY_ID } } }],
                  after,
                },
              },
            },
          },
        },
      },
      { requestTimeout: RISK_SCORING_REQUEST_TIMEOUT }
    );
    sampleTookMs += response.took;
    sampleRequests += 1;
    const keysAgg = response.aggregations?.sample.keys;
    const page = (keysAgg?.buckets ?? []).map((bucket) => bucket.key.entity_id);
    const ofType = page.filter((key) => key.startsWith(prefix));
    sampledKeys.push(...ofType);
    // Keys come in order, and the stamped field also holds other types' IDs: the first one from
    // another type ends this type's keys.
    after =
      ofType.length === page.length && page.length === COMPOSITE_PAGE_SIZE
        ? keysAgg?.after_key
        : undefined;
  }

  return {
    uppers: boundsFromSample(sampledKeys, entities, config.targetPageSize),
    sampledKeys,
    entities,
    alerts,
    probability,
    countTookMs: countResponse.took ?? 0,
    sampleTookMs,
    sampleRequests,
  };
};
