/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { AggregationBucket, AggregationOnlyResponse, AssetCriticalityStats } from '../type';

const getAssetCriticalityAggsQuery = (index: string) => ({
  size: 0,
  index,
  aggs: {
    asset_criticality_terms: {
      terms: {
        field: 'asset.criticality',
        size: 10,
        order: {
          last_doc_timestamp: 'desc' as const,
        },
      },
      aggs: {
        last_doc_timestamp: {
          max: {
            field: '@timestamp',
          },
        },
      },
    },
  },
});

/**
 * Structure of the full Elasticsearch aggregation response.
 */
export interface AggregationResponse {
  aggregations: {
    entity_type_terms: {
      buckets: AggregationBucket[];
    };
  };
}

/**
 * Parses aggregation buckets into a simplified list of entity stats.
 */
export const parseAssetCriticalityAggs = (
  response: AggregationOnlyResponse
): AssetCriticalityStats[] => {
  return response.buckets.map((bucket) => ({
    criticality: bucket.key,
    doc_count: bucket.doc_count,
    last_doc_timestamp: bucket.last_doc_timestamp.value_as_string,
  }));
};

/**
 * Queries Elasticsearch for entity type stats, parses, and returns them.
 */
export const getAssetCriticalityStats = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<AssetCriticalityStats[]> => {
  try {
    const isIndexExists = await esClient.indices.exists({
      index: '.entities.v1.latest*',
    });

    if (!isIndexExists) {
      logger.debug('Index ".entities.v1.latest*" does not exist.');
      return [];
    }

    const entityTypeStats = await esClient.search<
      unknown,
      {
        asset_criticality_terms: {
          buckets: AggregationBucket[];
        };
      }
    >(getAssetCriticalityAggsQuery('.entities.v1.latest*'));

    const buckets = entityTypeStats.aggregations?.asset_criticality_terms?.buckets ?? [];
    return parseAssetCriticalityAggs({ buckets });
  } catch (e) {
    logger.error(`Failed to get entity type stats: ${e instanceof Error ? e.message : String(e)}`);
    return [];
  }
};
