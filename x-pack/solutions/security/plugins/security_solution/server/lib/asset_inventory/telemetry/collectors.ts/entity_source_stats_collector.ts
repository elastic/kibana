/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { EntitySourceStats } from '../schema';

const getEntitySourceAggsQuery = (index: string) => ({
  size: 0,
  index,
  aggs: {
    entity_source_terms: {
      terms: {
        field: 'entity.source',
        size: 5,
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
 * Bucket structure returned from Elasticsearch aggregation.
 */
interface EntitySourceAggBucket {
  key: string;
  doc_count: number;
  last_doc_timestamp: {
    value: number;
    value_as_string: string;
  };
}

/**
 * Expected structure passed to the parser.
 */
export interface AggregationOnlyResponse {
  buckets: EntitySourceAggBucket[];
}

/**
 * Structure of the full Elasticsearch aggregation response.
 */
export interface AggregationResponse {
  aggregations: {
    entity_source_terms: {
      buckets: EntitySourceAggBucket[];
    };
  };
}

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
      index: '.entities.v1.latest*',
    });

    if (!isIndexExists) {
      logger.debug('Index ".entities.v1.latest*" does not exist.');
      return [];
    }

    const entityTypeStats = await esClient.search<
      unknown,
      {
        entity_source_terms: {
          buckets: EntitySourceAggBucket[];
        };
      }
    >(getEntitySourceAggsQuery('.entities.v1.latest*'));

    const buckets = entityTypeStats.aggregations?.entity_source_terms?.buckets ?? [];
    return parseEntitySourceAggs({ buckets });
  } catch (e) {
    logger.error(`Failed to get entity type stats: ${e instanceof Error ? e.message : String(e)}`);
    return [];
  }
};
