/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Client } from '@elastic/elasticsearch';
import { AI_ASSISTANT_KB_INFERENCE_ID } from '@kbn/observability-ai-assistant-plugin/server/service/inference_endpoint';
import { ToolingLog } from '@kbn/tooling-log';
import { RetryService } from '@kbn/ftr-common-functional-services';
import type { ObservabilityAIAssistantApiClient } from '../../../../services/observability_ai_assistant_api';
import { MachineLearningProvider } from '../../../../../services/ml';
import { SUPPORTED_TRAINED_MODELS } from '../../../../../../functional/services/ml/api';

export const TINY_ELSER = {
  ...SUPPORTED_TRAINED_MODELS.TINY_ELSER,
  id: SUPPORTED_TRAINED_MODELS.TINY_ELSER.name,
};

export async function importTinyElserModel(ml: ReturnType<typeof MachineLearningProvider>) {
  const config = {
    ...ml.api.getTrainedModelConfig(TINY_ELSER.name),
    input: {
      field_names: ['text_field'],
    },
  };
  // necessary for MKI, check indices before importing model.  compatible with stateful
  await ml.api.assureMlStatsIndexExists();
  await ml.api.importTrainedModel(TINY_ELSER.name, TINY_ELSER.id, config);
}

export async function setupKnowledgeBase(
  observabilityAIAssistantAPIClient: ObservabilityAIAssistantApiClient
) {
  const { status, body } = await observabilityAIAssistantAPIClient.admin({
    endpoint: 'POST /internal/observability_ai_assistant/kb/setup',
    params: {
      query: {
        model_id: TINY_ELSER.id,
      },
    },
  });

  return { status, body };
}

export async function waitForKnowledgeBaseReady({
  observabilityAIAssistantAPIClient,
  log,
  retry,
}: {
  observabilityAIAssistantAPIClient: ObservabilityAIAssistantApiClient;
  log: ToolingLog;
  retry: RetryService;
}) {
  await retry.tryForTime(5 * 60 * 1000, async () => {
    log.debug(`Waiting for knowledge base to be ready...`);
    const res = await observabilityAIAssistantAPIClient.editor({
      endpoint: 'GET /internal/observability_ai_assistant/kb/status',
    });
    expect(res.status).to.be(200);
    expect(res.body.ready).to.be(true);
  });
}

export async function deleteKnowledgeBaseModel(ml: ReturnType<typeof MachineLearningProvider>) {
  await ml.api.stopTrainedModelDeploymentES(TINY_ELSER.id, true);
  await ml.api.deleteTrainedModelES(TINY_ELSER.id);
  await ml.testResources.cleanMLSavedObjects();
}

export async function clearKnowledgeBase(es: Client) {
  const KB_INDEX = '.kibana-observability-ai-assistant-kb-*';

  return es.deleteByQuery({
    index: KB_INDEX,
    conflicts: 'proceed',
    query: { match_all: {} },
    refresh: true,
  });
}

export async function clearConversations(es: Client) {
  const KB_INDEX = '.kibana-observability-ai-assistant-conversations-*';

  return es.deleteByQuery({
    index: KB_INDEX,
    conflicts: 'proceed',
    query: { match_all: {} },
    refresh: true,
  });
}

export async function deleteInferenceEndpoint({
  es,
  name = AI_ASSISTANT_KB_INFERENCE_ID,
}: {
  es: Client;
  name?: string;
}) {
  return es.inference.delete({ inference_id: name, force: true });
}
