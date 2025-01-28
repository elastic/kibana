/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createObservabilityEsClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import { ElasticsearchClient, Logger } from '@kbn/core/server';

export async function createObservabilityAIAssistantAppEsClient({
  client,
  logger,
}: {
  client: ElasticsearchClient;
  logger: Logger;
}) {
  const esClient = createObservabilityEsClient({
    client,
    logger,
    plugin: 'observabilityAIAssistantApp',
  });

  return esClient;
}
