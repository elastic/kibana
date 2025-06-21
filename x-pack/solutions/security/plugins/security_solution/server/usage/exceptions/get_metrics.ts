/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { ExceptionMetricsSchema } from './types';
import { getExceptionsOverview } from './queries/get_exceptions_overview';

export interface GetExceptionsMetricsOptions {
  esClient: ElasticsearchClient;
  savedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
}

export const getExceptionsMetrics = async ({
  esClient,
  logger,
}: GetExceptionsMetricsOptions): Promise<ExceptionMetricsSchema> => {
  return getExceptionsOverview({
    esClient,
    logger,
  });
};
