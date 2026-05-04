/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { getQualityStatus } from '@kbn/siem-readiness-common';

/** Name of the data stream where ECS Data Quality Dashboard stores check results. */
export const DATA_QUALITY_RESULTS_INDEX = '.kibana-data-quality-dashboard-results*';

/** Shape of a single ECS Data Quality Dashboard check result document. */
export interface QualityResultDoc {
  indexName: string;
  incompatibleFieldCount: number;
  sameFamilyFieldCount: number;
  ecsFieldCount: number;
  customFieldCount: number;
  totalFieldCount: number;
  docsCount: number;
  sizeInBytes: number;
  checkedAt: number;
  ecsVersion?: string;
  error?: string | null;
}

/** QualityResultDoc enriched with a derived status field. */
export type QualityResultWithStatus = QualityResultDoc & {
  status: 'healthy' | 'incompatible';
};

interface QualityAggBucket {
  key: string;
  latest_doc: {
    hits: {
      hits: Array<{ _source: QualityResultDoc }>;
    };
  };
}

/**
 * Fetches the latest ECS compatibility check result for every index from the
 * Data Quality Dashboard results data stream.
 *
 * Returns a map of indexName → latest result with a derived status field.
 */
export const fetchQualityResults = async (
  esClient: ElasticsearchClient
): Promise<Map<string, QualityResultWithStatus>> => {
  const searchResponse = await esClient.search<QualityResultDoc>({
    index: DATA_QUALITY_RESULTS_INDEX,
    size: 0,
    query: { match_all: {} },
    aggs: {
      by_index: {
        terms: { field: 'indexName', size: 10000 },
        aggs: {
          latest_doc: {
            top_hits: {
              size: 1,
              sort: [{ '@timestamp': { order: 'desc' } }],
              _source: [
                'indexName',
                'incompatibleFieldCount',
                'sameFamilyFieldCount',
                'ecsFieldCount',
                'customFieldCount',
                'totalFieldCount',
                'docsCount',
                'sizeInBytes',
                'checkedAt',
                'ecsVersion',
                'error',
              ],
            },
          },
        },
      },
    },
  });

  const buckets =
    (
      searchResponse.aggregations as {
        by_index?: { buckets: QualityAggBucket[] };
      }
    )?.by_index?.buckets ?? [];

  const resultsByIndex = new Map<string, QualityResultWithStatus>();

  buckets.forEach((bucket) => {
    const source = bucket.latest_doc.hits.hits[0]?._source;
    if (!source) return;
    resultsByIndex.set(source.indexName, {
      ...source,
      status: getQualityStatus(source.incompatibleFieldCount),
    });
  });

  return resultsByIndex;
};
