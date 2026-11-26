/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { CreateKnowledgeBaseResponse } from '@kbn/elastic-assistant-common';
import {
  API_VERSIONS,
  ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_URL,
} from '@kbn/elastic-assistant-common';

import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import type { ToolingLog } from '@kbn/tooling-log';
import type SuperTest from 'supertest';
import { SUPPORTED_TRAINED_MODELS } from '@kbn/test-suites-xpack-platform/functional/services/ml/api';

import type { MachineLearningProvider } from '@kbn/test-suites-xpack-platform/api_integration/services/ml';
import { routeWithNamespace } from '@kbn/detections-response-ftr-services';

export const TINY_ELSER = {
  ...SUPPORTED_TRAINED_MODELS.TINY_ELSER,
  id: SUPPORTED_TRAINED_MODELS.TINY_ELSER.name,
};

export const TINY_ELSER_INFERENCE_ID = `${TINY_ELSER.id}_elasticsearch`;

/**
 * Installs `pt_tiny_elser` model for testing Kb features
 * @param ml
 */
export const installTinyElser = async ({
  es,
  ml,
  log,
}: {
  es: Client;
  ml: ReturnType<typeof MachineLearningProvider>;
  log: ToolingLog;
}) => {
  try {
    const config = {
      ...ml.api.getTrainedModelConfig(TINY_ELSER.name),
      input: {
        field_names: ['text_field'],
      },
    };
    await ml.api.assureMlStatsIndexExists();
    await ml.api.importTrainedModel(TINY_ELSER.name, TINY_ELSER.id, config);
  } catch (e) {
    log.error(`Error installing Tiny Elser: ${e}`);
    throw e;
  }
  try {
    await es.inference.put({
      task_type: 'sparse_embedding',
      inference_id: TINY_ELSER_INFERENCE_ID,
      inference_config: {
        service: 'elasticsearch',
        service_settings: {
          adaptive_allocations: {
            enabled: true,
            min_number_of_allocations: 0,
            max_number_of_allocations: 8,
          },
          num_threads: 1,
          model_id: TINY_ELSER.id,
        },
        task_settings: {},
      },
    });
  } catch (e) {
    log.error(`Error registering Tiny Elser inference endpoint: ${e}`);
    throw e;
  }
};

/**
 * Confirms `TINY_ELSER_INFERENCE_ID` is registered AND can actually serve a sparse_embedding
 * request. With `adaptive_allocations.min_number_of_allocations: 0` the endpoint can be registered
 * with zero live allocations, so a `GET /_inference/{id}` check would succeed before the model is
 * deployable. The KB index has a `semantic_text` field bound to this inference id, and indexing
 * triggers inference synchronously, so the first `createEntry` would otherwise pay (and possibly
 * fail) the cold-start cost. Running a dummy inference here forces allocation and proves the
 * endpoint is warm before any test runs.
 */
export const waitForInferenceEndpoint = async ({
  es,
  log,
}: {
  es: Client;
  log: ToolingLog;
}): Promise<void> => {
  const maxAttempts = 30;
  const delayMs = 2000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await es.inference.inference({
        inference_id: TINY_ELSER_INFERENCE_ID,
        input: 'warmup',
      });
      log.debug(`Inference endpoint ${TINY_ELSER_INFERENCE_ID} is warm`);
      return;
    } catch (e) {
      log.debug(
        `Waiting for inference endpoint ${TINY_ELSER_INFERENCE_ID} (attempt ${attempt}/${maxAttempts}): ${e}`
      );
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw new Error(
    `Inference endpoint ${TINY_ELSER_INFERENCE_ID} was not ready after ${
      (maxAttempts * delayMs) / 1000
    }s`
  );
};

/**
 * Deletes `pt_tiny_elser` model for testing Kb features
 * @param ml
 */
export const deleteTinyElser = async ({
  es,
  ml,
  log,
}: {
  es: Client;
  ml: ReturnType<typeof MachineLearningProvider>;
  log: ToolingLog;
}) => {
  try {
    await es.inference.delete({
      inference_id: TINY_ELSER_INFERENCE_ID,
      force: true,
    });
  } catch (e) {
    log.error(`Error deleting Tiny Elser Inference endpoint: ${e}`);
  }
  await ml.api.stopTrainedModelDeploymentES(TINY_ELSER.id, true);
  await ml.api.deleteTrainedModelES(TINY_ELSER.id);
  await ml.api.cleanMlIndices();
  await ml.testResources.cleanMLSavedObjects();
};

export const getTinyElserServerArgs = () => {
  return [
    `--xpack.productDocBase.elserInferenceId=${TINY_ELSER_INFERENCE_ID}`,
    `--xpack.securitySolution.siemRuleMigrations.elserInferenceId=${TINY_ELSER_INFERENCE_ID}`,
    `--xpack.elasticAssistant.elserInferenceId=${TINY_ELSER_INFERENCE_ID}`,
  ];
};

/**
 * Setup Knowledge Base
 * @param supertest The supertest deps
 * @param log The tooling logger
 * @param resource
 * @param namespace The Kibana Space where the KB should be set up
 */
export const setupKnowledgeBase = async (
  supertest: SuperTest.Agent,
  log: ToolingLog,
  resource?: string,
  namespace?: string
): Promise<CreateKnowledgeBaseResponse> => {
  const path = ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_URL.replace('{resource?}', resource || '');
  const route = routeWithNamespace(`${path}?ignoreSecurityLabs=true`, namespace);
  const response = await supertest
    .post(route)
    .set('kbn-xsrf', 'true')
    .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.public.v1)
    .send();
  if (response.status !== 200) {
    throw new Error(
      `Unexpected non 200 ok when attempting to setup Knowledge Base: ${JSON.stringify(
        response.status
      )},${JSON.stringify(response, null, 4)}`
    );
  } else {
    return response.body;
  }
};

/**
 * Clear Knowledge Base
 * @param es
 * @param space
 */
export const clearKnowledgeBase = async (es: Client, space = 'default') => {
  return es.deleteByQuery({
    index: `.kibana-elastic-ai-assistant-knowledge-base-${space}`,
    conflicts: 'proceed',
    query: { match_all: {} },
    refresh: true,
  });
};
