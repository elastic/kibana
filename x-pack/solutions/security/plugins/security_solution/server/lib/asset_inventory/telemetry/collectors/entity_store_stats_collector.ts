/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { AggregationBucket, AggregationOnlyResponse, EntityStoreStats } from '../type';
import { ENTITY_INDEX, getAggsQuery } from '../helper';

/**
 * Parses aggregation buckets into a simplified list of entity stats.
 */
export const parseEntityStoreAggs = (response: AggregationOnlyResponse): EntityStoreStats[] => {
  return response.buckets.map((bucket) => ({
    entity_store: bucket.key,
    doc_count: bucket.doc_count,
    last_doc_timestamp: bucket.last_doc_timestamp.value_as_string,
  }));
};

/**
 * Queries Elasticsearch for entity type stats, parses, and returns them.
 */
export const getEntityStoreStats = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<EntityStoreStats[]> => {
  try {
    const isIndexExists = await esClient.indices.exists({
      index: ENTITY_INDEX,
    });

    if (!isIndexExists) {
      logger.debug(`Index ${ENTITY_INDEX} does not exist.`);
      return [];
    }

    const entityStoreStats = await esClient.search<
      unknown,
      {
        field_terms: {
          buckets: AggregationBucket[];
        };
      }
    >(getAggsQuery('entity.EngineMetadata.Type', 5));

    const buckets = entityStoreStats.aggregations?.field_terms?.buckets ?? [];
    return parseEntityStoreAggs({ buckets });
  } catch (e) {
    logger.error(`Failed to get entity store stats: ${e instanceof Error ? e.message : String(e)}`);
    return [];
  }
};
