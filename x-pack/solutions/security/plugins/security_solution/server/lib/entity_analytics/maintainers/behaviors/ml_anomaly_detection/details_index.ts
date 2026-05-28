/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { getMlAdDetailsIndexName, ML_AD_DETAILS_INDEX_BASE } from './constants';

const ML_AD_DETAILS_INDEX_TEMPLATE_NAME = '.entity_analytics.ml-ad-jobs-latest-template';

export const ML_AD_DETAILS_MAPPING: MappingTypeMapping = {
  properties: {
    '@timestamp': { type: 'date' },
    entity: {
      properties: {
        id: { type: 'keyword' },
        type: { type: 'keyword' },
      },
    },
    anomaly: {
      properties: {
        _id: { type: 'keyword' },
        job_id: { type: 'keyword' },
        detector_index: { type: 'integer' },
        timestamp: { type: 'date' },
        record_score: { type: 'float' },
        field_name: { type: 'keyword' },
        actual: { type: 'double' },
        typical: { type: 'double' },
        by_field_name: { type: 'keyword' },
        by_field_value: { type: 'keyword' },
        over_field_name: { type: 'keyword' },
        over_field_value: { type: 'keyword' },
        partition_field_name: { type: 'keyword' },
        partition_field_value: { type: 'keyword' },
      },
    },
    baseline: {
      type: 'object',
      enabled: false,
    },
  },
};

interface EnsureMlAdDetailsDataStreamOpts {
  esClient: ElasticsearchClient;
  logger: Logger;
  namespace: string;
}

export const ensureMlAdDetailsDataStream = async ({
  esClient,
  logger,
  namespace,
}: EnsureMlAdDetailsDataStreamOpts): Promise<string> => {
  const dataStream = getMlAdDetailsIndexName(namespace);

  try {
    await esClient.indices.putIndexTemplate({
      name: ML_AD_DETAILS_INDEX_TEMPLATE_NAME,
      index_patterns: [`${ML_AD_DETAILS_INDEX_BASE}-*`],
      data_stream: {},
      template: {
        mappings: ML_AD_DETAILS_MAPPING,
        lifecycle: {
          data_retention: '90d',
        },
      },
    });

    try {
      await esClient.indices.createDataStream({ name: dataStream });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes('resource_already_exists_exception')) {
        throw error;
      }
    }
  } catch (error) {
    logger.warn(
      `Error ensuring ML AD details data stream exists: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  return dataStream;
};
