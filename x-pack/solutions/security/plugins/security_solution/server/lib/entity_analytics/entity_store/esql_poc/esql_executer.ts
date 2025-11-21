/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';

export const executeEsqlQuery = async (
  esClient: ElasticsearchClient,
  query: string,
  logger: Logger
) => {
  try {
    const response = (await esClient.esql.query({
      query,
      drop_null_columns: true,
      allow_partial_results: true,
    })) as unknown as ESQLSearchResponse;

    const { columns, values } = response;

    return values.map((row) => {
      const mappedRow: Record<string, unknown> = {};
      for (let i = 0; i < row.length; i++) {
        mappedRow[columns[i].name] = row[i];
      }

      return mappedRow;
    });
  } catch (error) {
    logger.debug(`Error executing ES|QL request: ${error.message}`);
    return [];
  }
};
