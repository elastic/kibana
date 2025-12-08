/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { EntityType } from '../../../../../common/api/entity_analytics';

export const executeEsqlQuery = async (
  esClient: ElasticsearchClient,
  type: EntityType,
  query: string,
  logger: Logger
): Promise<ESQLSearchResponse> => {
  try {
    const response = (await esClient.esql.query({
      query,
      drop_null_columns: true,
      allow_partial_results: true,
    })) as unknown as ESQLSearchResponse;

    return response;
  } catch (error) {
    logger.error(`[Entity Store ESQL] [${type}] Error executing ES|QL request: ${error.message}`);
    // Return empty response structure instead of empty array
    return { columns: [], values: [] };
  }
};
