/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { AggregationBucket, AggregationOnlyResponse, EntitySourceStats } from '../type';
import { ENTITY_INDEX, getAggsQuery } from '../helper';

/**
 * Parses aggregation buckets into a simplified list of entity stats.
 */
export const parseEntitySourceAggs = (response: AggregationOnlyResponse): EntitySourceStats[] => {
  return response.buckets.map((bucket) => ({
    entity_source: bucket.key,
    doc_count: bucket.doc_count,
    last_doc_timestamp: bucket.last_doc_timestamp.value_as_string,
  }));
};

/**
 * Queries Elasticsearch for entity type stats, parses, and returns them.
 */
export const getEntitySourceStats = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<EntitySourceStats[]> => {
  try {
    const isIndexExists = await esClient.indices.exists({
      index: ENTITY_INDEX,
    });

    if (!isIndexExists) {
      logger.debug(`Index ${ENTITY_INDEX} does not exist.`);
      return [];
    }

    const entitySourceStats = await esClient.search<
      unknown,
      {
        field_terms: {
          buckets: AggregationBucket[];
        };
      }
    >(getAggsQuery('entity.source', 500));

    const buckets = entitySourceStats.aggregations?.field_terms?.buckets ?? [];
    return parseEntitySourceAggs({ buckets });
  } catch (e) {
    logger.error(
      `Failed to get entity source stats: ${e instanceof Error ? e.message : String(e)}`
    );
    return [];
  }
};
