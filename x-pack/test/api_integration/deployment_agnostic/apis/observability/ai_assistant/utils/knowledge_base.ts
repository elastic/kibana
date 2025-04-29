/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import { RetryService } from '@kbn/ftr-common-functional-services';
import {
  Instruction,
  KnowledgeBaseState,
} from '@kbn/observability-ai-assistant-plugin/common/types';
import { resourceNames } from '@kbn/observability-ai-assistant-plugin/server/service';
import { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
import { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import type { ObservabilityAIAssistantApiClient } from '../../../../services/observability_ai_assistant_api';
import { MachineLearningProvider } from '../../../../../services/ml';
import { SUPPORTED_TRAINED_MODELS } from '../../../../../../functional/services/ml/api';
import { setAdvancedSettings } from './advanced_settings';

export const LEGACY_INFERENCE_ID = 'obs_ai_assistant_kb_inference';
export const TINY_ELSER_MODEL_ID = SUPPORTED_TRAINED_MODELS.TINY_ELSER.name;
export const TINY_ELSER_INFERENCE_ID = 'pt_tiny_elser_inference_id';

export async function importTinyElserModel(ml: ReturnType<typeof MachineLearningProvider>) {
  const config = {
    ...ml.api.getTrainedModelConfig(TINY_ELSER_MODEL_ID),
    input: {
      field_names: ['text_field'],
    },
  };
  // necessary for MKI, check indices before importing model.  compatible with stateful
  await ml.api.assureMlStatsIndexExists();
  await ml.api.importTrainedModel(TINY_ELSER_MODEL_ID, TINY_ELSER_MODEL_ID, config);
}

export function createTinyElserInferenceEndpoint({
  es,
  log,
  inferenceId = TINY_ELSER_INFERENCE_ID,
}: {
  es: Client;
  log: ToolingLog;
  inferenceId: string;
}) {
  return createInferenceEndpoint({
    es,
    log,
    modelId: TINY_ELSER_MODEL_ID,
    inferenceId,
    taskType: 'sparse_embedding',
  });
}

export async function deployTinyElserAndSetupKb(
  getService: DeploymentAgnosticFtrProviderContext['getService']
) {
  const log = getService('log');
  const ml = getService('ml');
  const retry = getService('retry');
  const es = getService('es');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');

  await importTinyElserModel(ml);
  await createTinyElserInferenceEndpoint({ es, log, inferenceId: TINY_ELSER_INFERENCE_ID }).catch(
    () => {}
  );

  const { status, body } = await observabilityAIAssistantAPIClient.admin({
    endpoint: 'POST /internal/observability_ai_assistant/kb/setup',
    params: {
      query: { inference_id: TINY_ELSER_INFERENCE_ID },
    },
  });

  await waitForKnowledgeBaseReady({ observabilityAIAssistantAPIClient, log, retry });

  return { status, body };
}

export async function reIndexKnowledgeBase(
  observabilityAIAssistantAPIClient: ObservabilityAIAssistantApiClient
) {
  return observabilityAIAssistantAPIClient.admin({
    endpoint: 'POST /internal/observability_ai_assistant/kb/reindex',
    params: {
      query: {
        inference_id: TINY_ELSER_INFERENCE_ID,
      },
    },
  });
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
    expect(res.body.kbState).to.be(KnowledgeBaseState.READY);
    log.debug(`Knowledge base is in ready state.`);
  });
}

export async function deleteTinyElserModel(
  getService: DeploymentAgnosticFtrProviderContext['getService']
) {
  const log = getService('log');
  const ml = getService('ml');

  try {
    await ml.api.stopTrainedModelDeploymentES(TINY_ELSER_MODEL_ID, true);
    await ml.api.deleteTrainedModelES(TINY_ELSER_MODEL_ID);
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

export async function deleteTinyElserModelAndInferenceEndpoint(
  getService: DeploymentAgnosticFtrProviderContext['getService']
) {
  const log = getService('log');
  const es = getService('es');

  await deleteTinyElserModel(getService);
  await deleteInferenceEndpoint({ es, log, inferenceId: TINY_ELSER_INFERENCE_ID });
}

export async function clearKnowledgeBase(es: Client) {
  return es.deleteByQuery({
    index: resourceNames.indexPatterns.kb,
    conflicts: 'proceed',
    query: { match_all: {} },
    refresh: true,
  });
}

export async function getAllKbEntries(es: Client) {
  const response = await es.search({
    index: resourceNames.indexPatterns.kb,
    query: { match_all: {} },
  });
  return response.hits.hits;
}

export async function deleteInferenceEndpoint({
  es,
  log,
  inferenceId,
}: {
  es: Client;
  log: ToolingLog;
  inferenceId: string;
}) {
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
  modelId,
  inferenceId,
  taskType,
}: {
  es: Client;
  log: ToolingLog;
  modelId: string;
  inferenceId: string;
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

export async function addSampleDocsToInternalKb(
  getService: DeploymentAgnosticFtrProviderContext['getService'],
  sampleDocs: Array<Instruction & { title: string }>
) {
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');

  await observabilityAIAssistantAPIClient.editor({
    endpoint: 'POST /internal/observability_ai_assistant/kb/entries/import',
    params: {
      body: {
        entries: sampleDocs,
      },
    },
  });
}

export async function addSampleDocsToCustomIndex(
  getService: DeploymentAgnosticFtrProviderContext['getService'],
  sampleDocs: Array<Instruction & { title: string }>,
  customSearchConnectorIndex: string
) {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');

  // create index with semantic_text mapping for `text` field
  log.info('Creating custom index with sample animal docs...');
  await es.indices.create({
    index: customSearchConnectorIndex,
    mappings: {
      properties: {
        title: { type: 'text' },
        text: { type: 'semantic_text', inference_id: TINY_ELSER_INFERENCE_ID },
      },
    },
  });

  log.info('Indexing sample animal docs...');
  // ingest sampleDocs
  await Promise.all(
    sampleDocs.map(async (doc) => {
      const { id, ...restDoc } = doc;
      return es.index({
        refresh: 'wait_for',
        index: customSearchConnectorIndex,
        id,
        body: restDoc,
      });
    })
  );

  // update the advanced settings (`observability:aiAssistantSearchConnectorIndexPattern`) to include the custom index
  await setAdvancedSettings(supertest, {
    'observability:aiAssistantSearchConnectorIndexPattern': customSearchConnectorIndex,
  });
}

export async function getKbIndices(es: Client) {
  const res = await es.cat.indices({
    index: resourceNames.indexPatterns.kb,
    format: 'json',
    h: 'index',
  });

  return res.map(({ index }) => index!);
}

export async function deleteKbIndices(es: Client) {
  const index = await getKbIndices(es);
  if (index.length > 0) {
    await es.indices.delete({ index, ignore_unavailable: true });
  }
}

export async function getConcreteWriteIndexFromAlias(es: Client) {
  const response = await es.indices.getAlias({ index: resourceNames.writeIndexAlias.kb });
  return Object.entries(response).find(
    ([index, aliasInfo]) => aliasInfo.aliases[resourceNames.writeIndexAlias.kb]?.is_write_index
  )?.[0];
}

export async function hasIndexWriteBlock(es: Client, index: string) {
  const response = await es.indices.getSettings({ index });
  const writeBlockSetting = Object.values(response)[0]?.settings?.index?.blocks?.write;
  return writeBlockSetting === 'true' || writeBlockSetting === true;
}

export async function getKbIndexCreatedVersion(es: Client) {
  const indexSettings = await es.indices.getSettings({
    index: resourceNames.writeIndexAlias.kb,
    human: true,
  });

  const { settings } = Object.values(indexSettings)[0];
  const createdVersion = settings?.index?.version?.created_string;
  if (!createdVersion) {
    throw new Error(`Could not find created version for index ${resourceNames.writeIndexAlias.kb}`);
  }
  return createdVersion;
}
