/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { MachineLearningProvider } from '../../../api_integration/services/ml';
import { SUPPORTED_TRAINED_MODELS } from '../../../functional/services/ml/api';

export const TINY_ELSER = {
  ...SUPPORTED_TRAINED_MODELS.TINY_ELSER,
  id: SUPPORTED_TRAINED_MODELS.TINY_ELSER.name,
};

export async function createKnowledgeBaseModel(ml: ReturnType<typeof MachineLearningProvider>) {
  const config = {
    ...ml.api.getTrainedModelConfig(TINY_ELSER.name),
    input: {
      field_names: ['text_field'],
    },
  };
  await ml.api.importTrainedModel(TINY_ELSER.name, TINY_ELSER.id, config);
  await ml.api.assureMlStatsIndexExists();
}

export async function deleteKnowledgeBaseModel(ml: ReturnType<typeof MachineLearningProvider>) {
  await ml.api.stopTrainedModelDeploymentES(TINY_ELSER.id, true);
  await ml.api.deleteTrainedModelES(TINY_ELSER.id);
  await ml.api.cleanMlIndices();
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
