/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Client } from '@elastic/elasticsearch';
import {
  getResourceName,
  resourceNames,
} from '@kbn/observability-ai-assistant-plugin/server/service';
import { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import type { ObservabilityAIAssistantApiClient } from '../../../../services/observability_ai_assistant_api';
import { TINY_ELSER_INFERENCE_ID } from './model_and_inference';

export async function runStartupMigrations(
  observabilityAIAssistantAPIClient: ObservabilityAIAssistantApiClient
) {
  const { status } = await observabilityAIAssistantAPIClient.editor({
    endpoint: 'POST /internal/observability_ai_assistant/kb/migrations/startup',
  });
  expect(status).to.be(200);
}

export async function createOrUpdateIndexAssets(
  observabilityAIAssistantAPIClient: ObservabilityAIAssistantApiClient
) {
  const { status } = await observabilityAIAssistantAPIClient.editor({
    endpoint: 'POST /internal/observability_ai_assistant/index_assets',
    params: {
      query: {
        inference_id: TINY_ELSER_INFERENCE_ID,
      },
    },
  });
  expect(status).to.be(200);
}

export async function deleteIndexAssets(
  getService: DeploymentAgnosticFtrProviderContext['getService']
) {
  const es = getService('es');
  const log = getService('log');

  // delete write indices
  const response = await es.indices.get({ index: getResourceName('*') });
  const indicesToDelete = Object.keys(response);

  if (indicesToDelete.length > 0) {
    log.debug(`Deleting indices: ${indicesToDelete.join(', ')}`);
    try {
      await Promise.all(
        indicesToDelete.map(async (index) => es.indices.delete({ index, ignore_unavailable: true }))
      );
    } catch (err) {
      log.error(`Failed to delete indices: ${err}`);
    }
  }

  await es.indices.deleteIndexTemplate({ name: getResourceName('*') }, { ignore: [404] });
  await es.cluster.deleteComponentTemplate({ name: getResourceName('*') }, { ignore: [404] });
}

export async function restoreIndexAssets(
  getService: DeploymentAgnosticFtrProviderContext['getService']
) {
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');

  await deleteIndexAssets(getService);
  await createOrUpdateIndexAssets(observabilityAIAssistantAPIClient);
}

export async function getComponentTemplate(es: Client) {
  const res = await es.cluster.getComponentTemplate({
    name: resourceNames.componentTemplate.kb,
  });

  return res.component_templates[0];
}
