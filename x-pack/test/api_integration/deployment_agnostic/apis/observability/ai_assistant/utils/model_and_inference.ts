/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
import { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import { MachineLearningProvider } from '../../../../../services/ml';
import { SUPPORTED_TRAINED_MODELS } from '../../../../../../functional/services/ml/api';
import { setupKnowledgeBase, waitForKnowledgeBaseReady } from './knowledge_base';

export const LEGACY_CUSTOM_INFERENCE_ID = 'obs_ai_assistant_kb_inference';

// tiny models
export const TINY_ELSER_MODEL_ID = SUPPORTED_TRAINED_MODELS.TINY_ELSER.name;
export const TINY_TEXT_EMBEDDING_MODEL_ID = SUPPORTED_TRAINED_MODELS.TINY_TEXT_EMBEDDING.name;

// tiny inference endpoints
export const TINY_ELSER_INFERENCE_ID = 'pt_tiny_elser_inference_id';
export const TINY_TEXT_EMBEDDING_INFERENCE_ID = 'pt_tiny_text_embedding_inference_id';

export async function importModel(
  ml: ReturnType<typeof MachineLearningProvider>,
  {
    modelId,
  }: {
    modelId: typeof TINY_ELSER_MODEL_ID | typeof TINY_TEXT_EMBEDDING_MODEL_ID;
  }
) {
  const config = ml.api.getTrainedModelConfig(modelId);
  await ml.api.assureMlStatsIndexExists();
  await ml.api.importTrainedModel(modelId, modelId, config);
}

export async function setupTinyElserModelAndInferenceEndpoint(
  getService: DeploymentAgnosticFtrProviderContext['getService']
) {
  const ml = getService('ml');

  await importModel(ml, { modelId: TINY_ELSER_MODEL_ID });
  await createTinyElserInferenceEndpoint(getService, { inferenceId: TINY_ELSER_INFERENCE_ID });
}

export async function teardownTinyElserModelAndInferenceEndpoint(
  getService: DeploymentAgnosticFtrProviderContext['getService']
) {
  await deleteModel(getService, { modelId: TINY_ELSER_MODEL_ID });
  await deleteInferenceEndpoint(getService, { inferenceId: TINY_ELSER_INFERENCE_ID });
}

export function createTinyElserInferenceEndpoint(
  getService: DeploymentAgnosticFtrProviderContext['getService'],
  { inferenceId }: { inferenceId: string }
) {
  const es = getService('es');
  const log = getService('log');

  return createInferenceEndpoint({
    es,
    log,
    modelId: TINY_ELSER_MODEL_ID,
    inferenceId,
    taskType: 'sparse_embedding',
  });
}

export function createTinyTextEmbeddingInferenceEndpoint(
  getService: DeploymentAgnosticFtrProviderContext['getService'],
  { inferenceId }: { inferenceId: string }
) {
  const es = getService('es');
  const log = getService('log');

  return createInferenceEndpoint({
    es,
    log,
    modelId: TINY_TEXT_EMBEDDING_MODEL_ID,
    inferenceId,
    taskType: 'text_embedding',
  });
}

export async function deployTinyElserAndSetupKb(
  getService: DeploymentAgnosticFtrProviderContext['getService']
) {
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');

  await setupTinyElserModelAndInferenceEndpoint(getService);
  const { status, body } = await setupKnowledgeBase(
    observabilityAIAssistantAPIClient,
    TINY_ELSER_INFERENCE_ID
  );
  await waitForKnowledgeBaseReady(getService);

  return { status, body };
}

export async function deleteInferenceEndpoint(
  getService: DeploymentAgnosticFtrProviderContext['getService'],
  {
    inferenceId,
  }: {
    inferenceId: string;
  }
) {
  const es = getService('es');
  const log = getService('log');

  try {
    await es.inference.delete({ inference_id: inferenceId, force: true });
    log.info(`Inference endpoint "${inferenceId}" deleted.`);
  } catch (e) {
    if (e.message.includes('resource_not_found_exception')) {
      log.debug(`Inference endpoint "${inferenceId}" was already deleted.`);
    } else {
      log.error(`Could not delete inference endpoint "${inferenceId}": ${e}`);
    }
  }
}

export async function createInferenceEndpoint({
  es,
  log,
  inferenceId,
  modelId,
  taskType,
}: {
  es: Client;
  log: ToolingLog;
  inferenceId: string;
  modelId: string;
  taskType?: InferenceTaskType;
}) {
  try {
    const res = await es.inference.put({
      inference_id: inferenceId,
      task_type: taskType,
      inference_config: {
        service: 'elasticsearch',
        service_settings: {
          model_id: modelId,
          adaptive_allocations: { enabled: true, min_number_of_allocations: 1 },
          num_threads: 1,
        },
        task_settings: {},
      },
    });

    log.info(`Inference endpoint ${inferenceId} created.`);
    return res;
  } catch (e) {
    log.error(`Error creating inference endpoint "${inferenceId}": ${e}`);
    throw e;
  }
}

export async function deleteModel(
  getService: DeploymentAgnosticFtrProviderContext['getService'],
  {
    modelId,
  }: {
    modelId: typeof TINY_ELSER_MODEL_ID | typeof TINY_TEXT_EMBEDDING_MODEL_ID;
  }
) {
  const log = getService('log');
  const ml = getService('ml');

  try {
    await ml.api.stopTrainedModelDeploymentES(modelId, true);
    await ml.api.deleteTrainedModelES(modelId);
    await ml.testResources.cleanMLSavedObjects();
    log.info(`Knowledge base model deleted.`);
  } catch (e) {
    if (e.message.includes('resource_not_found_exception')) {
      log.debug(`Knowledge base model was already deleted.`);
    } else {
      log.error(`Could not delete knowledge base model: ${e}`);
    }
  }
}

export async function stopTinyElserModel(
  getService: DeploymentAgnosticFtrProviderContext['getService']
) {
  const log = getService('log');
  const ml = getService('ml');

  try {
    await ml.api.stopTrainedModelDeploymentES(TINY_ELSER_INFERENCE_ID, true);
    log.info(`Knowledge base model (${TINY_ELSER_MODEL_ID}) stopped.`);
  } catch (e) {
    log.error(`Could not stop knowledge base model (${TINY_ELSER_MODEL_ID}): ${e}`);
  }
}
