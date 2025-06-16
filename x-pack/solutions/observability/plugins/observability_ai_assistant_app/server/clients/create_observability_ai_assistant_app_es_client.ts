/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTracedEsClient } from '@kbn/traced-es-client';
import { ElasticsearchClient, Logger } from '@kbn/core/server';

export async function createObservabilityAIAssistantAppEsClient({
  client,
  logger,
}: {
  client: ElasticsearchClient;
  logger: Logger;
}) {
  const esClient = createTracedEsClient({
    client,
    logger,
    plugin: 'observabilityAIAssistantApp',
  });

  return esClient;
}
