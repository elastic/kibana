/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { StateType } from './graph';

export const FIND_INDICES_FOR_ML_JOBS_NODE = 'findIndicesForMlJobsNode';

interface MlIndexAggregation {
  ml_indices?: {
    buckets?: Array<{ key?: string }>;
  };
}

interface FindIndicesForMlJobsOpts {
  esClient: ElasticsearchClient;
  recommendedStartedJobIds: string[];
  threshold: number;
}

const ROLLOVER_SUFFIX_REGEX = /-(\d{6})$/;

const extractIndexBaseAndVersion = (indexName: string): { base: string; version: number } => {
  const match = indexName.match(ROLLOVER_SUFFIX_REGEX);

  if (!match) {
    return { base: indexName, version: -1 };
  }

  const suffix = match[1];
  return { base: indexName.slice(0, -suffix.length - 1), version: Number(suffix) };
};

const keepLatestVersionPerBaseIndex = (indices: string[]): string[] => {
  const latestByBase = new Map<string, { indexName: string; version: number }>();

  for (const indexName of indices) {
    const { base, version } = extractIndexBaseAndVersion(indexName);
    const currentLatest = latestByBase.get(base);

    if (!currentLatest || version > currentLatest.version) {
      latestByBase.set(base, { indexName, version });
    }
  }

  return Array.from(latestByBase.values(), ({ indexName }) => indexName);
};

export const findIndicesForMlJobsNode = async ({
  esClient,
  recommendedStartedJobIds,
  threshold,
}: FindIndicesForMlJobsOpts): Promise<Partial<StateType>> => {
  const response = await esClient.search({
    index: '.ml-anomalies-*',
    size: 0,
    query: {
      bool: {
        filter: [
          { terms: { job_id: recommendedStartedJobIds } },
          { range: { record_score: { gt: threshold } } },
        ],
      },
    },
    aggs: {
      ml_indices: {
        terms: {
          field: '_index',
          size: 100,
        },
      },
    },
  });

  const buckets = (response.aggregations as MlIndexAggregation | undefined)?.ml_indices?.buckets;
  const indices = (buckets ?? []).flatMap((bucket) =>
    typeof bucket.key === 'string' ? [bucket.key] : []
  );

  return { indices: keepLatestVersionPerBaseIndex(indices) };
};
