/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import {
  API_VERSIONS,
  CreateKnowledgeBaseResponse,
  ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_INDICES_URL,
  ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_URL,
  GetKnowledgeBaseIndicesResponse,
} from '@kbn/elastic-assistant-common';

import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import type { ToolingLog } from '@kbn/tooling-log';
import type SuperTest from 'supertest';
import { MachineLearningProvider } from '../../../../../../functional/services/ml';
import { SUPPORTED_TRAINED_MODELS } from '../../../../../../functional/services/ml/api';

import { routeWithNamespace } from '../../../../../../common/utils/security_solution';

export const TINY_ELSER = {
  ...SUPPORTED_TRAINED_MODELS.TINY_ELSER,
  id: SUPPORTED_TRAINED_MODELS.TINY_ELSER.name,
};

/**
 * Installs `pt_tiny_elser` model for testing Kb features
 * @param ml
 */
export const installTinyElser = async (ml: ReturnType<typeof MachineLearningProvider>) => {
  const config = {
    ...ml.api.getTrainedModelConfig(TINY_ELSER.name),
    input: {
      field_names: ['text_field'],
    },
  };
  await ml.api.assureMlStatsIndexExists();
  await ml.api.importTrainedModel(TINY_ELSER.name, TINY_ELSER.id, config);
};

/**
 * Deletes `pt_tiny_elser` model for testing Kb features
 * @param ml
 */
export const deleteTinyElser = async (ml: ReturnType<typeof MachineLearningProvider>) => {
  await ml.api.stopTrainedModelDeploymentES(TINY_ELSER.id, true);
  await ml.api.deleteTrainedModelES(TINY_ELSER.id);
  await ml.api.cleanMlIndices();
  await ml.testResources.cleanMLSavedObjects();
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
  const route = routeWithNamespace(
    `${path}?modelId=pt_tiny_elser&ignoreSecurityLabs=true`,
    namespace
  );
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

/**
 * Get indices with the `semantic_text` type fields
 * @param supertest The supertest deps
 * @param log The tooling logger
 */
export const getKnowledgeBaseIndices = async ({
  supertest,
  log,
}: {
  supertest: SuperTest.Agent;
  log: ToolingLog;
}): Promise<GetKnowledgeBaseIndicesResponse> => {
  const response = await supertest
    .get(ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_INDICES_URL)
    .set('kbn-xsrf', 'true')
    .set(ELASTIC_HTTP_VERSION_HEADER, '1')
    .send();
  if (response.status !== 200) {
    throw new Error(
      `Unexpected non 200 ok when attempting to find entries: ${JSON.stringify(
        response.status
      )},${JSON.stringify(response, null, 4)}`
    );
  } else {
    return response.body;
  }
};
