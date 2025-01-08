/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesPutIndexTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { retryTransientEsErrors } from '../helpers/retry';

interface TemplateManagementOptions {
  esClient: ElasticsearchClient;
  template: IndicesPutIndexTemplateRequest;
  logger: Logger;
}

interface DeleteTemplateOptions {
  esClient: ElasticsearchClient;
  name: string;
  logger: Logger;
}

export async function upsertTemplate({ esClient, template, logger }: TemplateManagementOptions) {
  try {
    await retryTransientEsErrors(() => esClient.indices.putIndexTemplate(template), { logger });
    logger.debug(() => `Installed index template: ${JSON.stringify(template)}`);
  } catch (error: any) {
    logger.error(`Error updating index template: ${error.message}`);
    throw error;
  }
}

export async function deleteTemplate({ esClient, name, logger }: DeleteTemplateOptions) {
  try {
    await retryTransientEsErrors(
      () => esClient.indices.deleteIndexTemplate({ name }, { ignore: [404] }),
      { logger }
    );
  } catch (error: any) {
    logger.error(`Error deleting index template: ${error.message}`);
    throw error;
  }
}
