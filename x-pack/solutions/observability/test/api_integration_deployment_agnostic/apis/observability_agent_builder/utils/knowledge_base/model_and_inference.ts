/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { errors } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
import pRetry from 'p-retry';
import { SUPPORTED_TRAINED_MODELS } from '@kbn/test-suites-xpack-platform/functional/services/ml/api';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import { setupKnowledgeBase, waitForKnowledgeBaseReady } from './knowledge_base_management';

export const TINY_ELSER_MODEL_ID = SUPPORTED_TRAINED_MODELS.TINY_ELSER.name;
export const TINY_ELSER_INFERENCE_ID = 'pt_tiny_elser_inference_id';

export async function importModel(
  getService: DeploymentAgnosticFtrProviderContext['getService'],
  { modelId }: { modelId: typeof TINY_ELSER_MODEL_ID }
) {
  const ml = getService('ml');
  const log = getService('log');

  const config = ml.api.getTrainedModelConfig(modelId);

  await ml.api.assureMlStatsIndexExists();

  try {
    await ml.api.importTrainedModel(modelId, modelId, config);
    log.info(`Model "${modelId}" imported successfully.`);
  } catch (error) {
    if (
      error.message.includes('resource_already_exists_exception') ||
      error.message.includes(
        'the model id is the same as the deployment id of a current model deployment'
      )
    ) {
      log.info(`Model "${modelId}" is already imported. Skipping import.`);
      return;
    }

    log.error(`Could not import model "${modelId}": ${error}`);
    throw error;
  }
}

export async function createTinyElserInferenceEndpoint(
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
  return pRetry(
    async () => {
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
      } catch (error) {
        if (
          error instanceof errors.ResponseError &&
          (error.body?.error?.type === 'resource_not_found_exception' ||
            error.body?.error?.type === 'status_exception')
        ) {
          log.debug(`Inference endpoint "${inferenceId}" already exists. Skipping creation.`);
          return;
        }
        log.error(`Error creating inference endpoint "${inferenceId}": ${error}`);
        throw error;
      }
    },
    { retries: 2 }
  );
}

export async function deleteInferenceEndpoint(
  getService: DeploymentAgnosticFtrProviderContext['getService'],
  { inferenceId }: { inferenceId: string }
) {
  const es = getService('es');
  const log = getService('log');
  try {
    await es.inference.delete({ inference_id: inferenceId, force: true });

    log.info(`Inference endpoint "${inferenceId}" deleted.`);
  } catch (e) {
    if (e.message.includes('resource_not_found_exception')) {
      log.debug(`Inference endpoint "${inferenceId}" was already deleted. Skipping deletion.`);
      return;
    }

    log.error(`Could not delete inference endpoint "${inferenceId}": ${e}`);
    throw e;
  }
}

export async function deleteModel(
  getService: DeploymentAgnosticFtrProviderContext['getService'],
  { modelId }: { modelId: typeof TINY_ELSER_MODEL_ID }
) {
  const log = getService('log');
  const ml = getService('ml');

  try {
    await ml.api.stopTrainedModelDeploymentES(modelId, true);
    await ml.api.deleteTrainedModelES(modelId);
    await ml.testResources.cleanMLSavedObjects();

    log.info('Knowledge base model deleted.');
  } catch (e) {
    if (e.message.includes('resource_not_found_exception')) {
      log.debug('Knowledge base model was already deleted.');
    } else {
      log.error(`Could not delete knowledge base model: ${e}`);
    }
  }
}

export async function deployTinyElserAndSetupKb(
  getService: DeploymentAgnosticFtrProviderContext['getService']
) {
  await importModel(getService, { modelId: TINY_ELSER_MODEL_ID });
  await createTinyElserInferenceEndpoint(getService, { inferenceId: TINY_ELSER_INFERENCE_ID });

  const { status, body } = await setupKnowledgeBase(getService, TINY_ELSER_INFERENCE_ID);
  await waitForKnowledgeBaseReady(getService);

  return { status, body };
}

export async function teardownTinyElserModelAndInferenceEndpoint(
  getService: DeploymentAgnosticFtrProviderContext['getService']
) {
  await deleteModel(getService, { modelId: TINY_ELSER_MODEL_ID });
  await deleteInferenceEndpoint(getService, { inferenceId: TINY_ELSER_INFERENCE_ID });
}
