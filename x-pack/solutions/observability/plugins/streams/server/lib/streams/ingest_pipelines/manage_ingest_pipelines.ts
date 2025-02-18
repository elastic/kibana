/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { Logger } from '@kbn/logging';
import { IngestPutPipelineRequest } from '@elastic/elasticsearch/lib/api/types';
import { retryTransientEsErrors } from '../helpers/retry';

interface DeletePipelineOptions {
  esClient: ElasticsearchClient;
  id: string;
  logger: Logger;
}

interface PipelineManagementOptions {
  esClient: ElasticsearchClient;
  pipeline: IngestPutPipelineRequest;
  logger: Logger;
}

export async function deleteIngestPipeline({ esClient, id, logger }: DeletePipelineOptions) {
  try {
    await retryTransientEsErrors(() => esClient.ingest.deletePipeline({ id }, { ignore: [404] }), {
      logger,
    });
  } catch (error: any) {
    logger.error(`Error deleting ingest pipeline: ${error.message}`);
    throw error;
  }
}

export async function upsertIngestPipeline({
  esClient,
  pipeline,
  logger,
}: PipelineManagementOptions) {
  try {
    await retryTransientEsErrors(() => esClient.ingest.putPipeline(pipeline), { logger });
    logger.debug(() => `Installed index template: ${JSON.stringify(pipeline)}`);
  } catch (error: any) {
    logger.error(`Error updating index template: ${error.message}`);
    throw error;
  }
}
