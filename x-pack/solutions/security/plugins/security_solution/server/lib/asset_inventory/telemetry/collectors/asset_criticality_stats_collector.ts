/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { AggregationBucket, AggregationOnlyResponse, AssetCriticalityStats } from '../type';
import { ENTITY_INDEX, getAggsQuery } from '../helper';

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
      index: ENTITY_INDEX,
    });

    if (!isIndexExists) {
      logger.debug(`Index ${ENTITY_INDEX} does not exist.`);
      return [];
    }

    const assetCriticalityStats = await esClient.search<
      unknown,
      {
        field_terms: {
          buckets: AggregationBucket[];
        };
      }
    >(getAggsQuery('asset.criticality', 10));

    const buckets = assetCriticalityStats.aggregations?.field_terms?.buckets ?? [];
    return parseAssetCriticalityAggs({ buckets });
  } catch (e) {
    logger.error(
      `Failed to get asset criticality stats: ${e instanceof Error ? e.message : String(e)}`
    );
    return [];
  }
};
