/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Client } from '@elastic/elasticsearch';
import { resourceNames } from '@kbn/observability-ai-assistant-plugin/server/service';
import type { ObservabilityAIAssistantApiClient } from '../../../../services/observability_ai_assistant_api';

export async function createOrUpdateIndexAssets(
  observabilityAIAssistantAPIClient: ObservabilityAIAssistantApiClient
) {
  const { status } = await observabilityAIAssistantAPIClient.editor({
    endpoint: 'POST /internal/observability_ai_assistant/index_assets',
  });
  expect(status).to.be(200);
}

async function deleteWriteIndices(es: Client) {
  const response = await es.indices.get({ index: Object.values(resourceNames.indexPatterns) });
  const indicesToDelete = Object.keys(response);
  if (indicesToDelete.length > 0) {
    await es.indices.delete({ index: indicesToDelete, ignore_unavailable: true });
  }
}

export async function restoreIndexAssets(
  observabilityAIAssistantAPIClient: ObservabilityAIAssistantApiClient,
  es: Client
) {
  await deleteWriteIndices(es);

  // delete index templates
  await es.indices.deleteIndexTemplate(
    { name: Object.values(resourceNames.indexTemplate) },
    { ignore: [404] }
  );

  // delete component templates
  await es.cluster.deleteComponentTemplate(
    { name: Object.values(resourceNames.componentTemplate) },
    { ignore: [404] }
  );

  // create index assets from scratch
  await createOrUpdateIndexAssets(observabilityAIAssistantAPIClient);
}
