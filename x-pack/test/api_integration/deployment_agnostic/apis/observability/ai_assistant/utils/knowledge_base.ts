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
import {
  Instruction,
  KnowledgeBaseState,
} from '@kbn/observability-ai-assistant-plugin/common/types';
import { resourceNames } from '@kbn/observability-ai-assistant-plugin/server/service';
import { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import type { ObservabilityAIAssistantApiClient } from '../../../../services/observability_ai_assistant_api';
import { MachineLearningProvider } from '../../../../../services/ml';
import { SUPPORTED_TRAINED_MODELS } from '../../../../../../functional/services/ml/api';
import { setAdvancedSettings } from './advanced_settings';

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
  getService: DeploymentAgnosticFtrProviderContext['getService'],
  {
    deployModel: deployModel = true,
  }: {
    deployModel?: boolean;
  } = {}
) {
  const log = getService('log');
  const ml = getService('ml');
  const retry = getService('retry');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');

  if (deployModel) {
    await importTinyElserModel(ml);
  }

  const { status, body } = await observabilityAIAssistantAPIClient.admin({
    endpoint: 'POST /internal/observability_ai_assistant/kb/setup',
    params: {
      query: {
        model_id: TINY_ELSER.id,
      },
    },
  });

  if (deployModel) {
    await waitForKnowledgeBaseReady({ observabilityAIAssistantAPIClient, log, retry });
  }

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
    expect(res.body.kbState).to.be(KnowledgeBaseState.READY);
  });
}

export async function deleteKnowledgeBaseModel(
  getService: DeploymentAgnosticFtrProviderContext['getService'],
  {
    shouldDeleteInferenceEndpoint = true,
  }: {
    shouldDeleteInferenceEndpoint?: boolean;
  } = {}
) {
  const log = getService('log');
  const ml = getService('ml');
  const es = getService('es');

  try {
    await ml.api.stopTrainedModelDeploymentES(TINY_ELSER.id, true);
    await ml.api.deleteTrainedModelES(TINY_ELSER.id);
    await ml.testResources.cleanMLSavedObjects();

    if (shouldDeleteInferenceEndpoint) {
      await deleteInferenceEndpoint({ es });
    }
  } catch (e) {
    if (e.message.includes('resource_not_found_exception')) {
      log.debug(`Knowledge base model was already deleted.`);
      return;
    }

    log.error(`Could not delete knowledge base model: ${e}`);
  }
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
  name = AI_ASSISTANT_KB_INFERENCE_ID,
}: {
  es: Client;
  name?: string;
}) {
  return es.inference.delete({ inference_id: name, force: true });
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
        text: { type: 'semantic_text', inference_id: AI_ASSISTANT_KB_INFERENCE_ID },
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
  const response = await es.indices.getAlias({ index: resourceNames.aliases.kb });
  return Object.entries(response).find(
    ([index, aliasInfo]) => aliasInfo.aliases[resourceNames.aliases.kb]?.is_write_index
  )?.[0];
}

export async function hasIndexWriteBlock(es: Client, index: string) {
  const response = await es.indices.getSettings({ index });
  const writeBlockSetting = Object.values(response)[0]?.settings?.index?.blocks?.write;
  return writeBlockSetting === 'true' || writeBlockSetting === true;
}
