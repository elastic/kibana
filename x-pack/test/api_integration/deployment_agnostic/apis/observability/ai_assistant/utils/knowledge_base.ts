/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import {
  Instruction,
  KnowledgeBaseEntry,
  KnowledgeBaseState,
} from '@kbn/observability-ai-assistant-plugin/common/types';
import { resourceNames } from '@kbn/observability-ai-assistant-plugin/server/service';
import expect from '@kbn/expect';
import pRetry from 'p-retry';
import { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import { setAdvancedSettings } from './advanced_settings';
import { TINY_ELSER_INFERENCE_ID } from './model_and_inference';
import type { ObservabilityAIAssistantApiClient } from '../../../../services/observability_ai_assistant_api';

export async function clearKnowledgeBase(es: Client) {
  return pRetry(
    () => {
      return es.deleteByQuery({
        index: resourceNames.indexPatterns.kb,
        conflicts: 'proceed',
        query: { match_all: {} },
        refresh: true,
      });
    },
    { retries: 5 }
  );
}

export async function waitForKnowledgeBaseIndex(
  getService: DeploymentAgnosticFtrProviderContext['getService'],
  expectedIndex: string
) {
  const retry = getService('retry');
  const es = getService('es');

  await retry.try(async () => {
    const currentIndex = await getConcreteWriteIndexFromAlias(es);
    expect(currentIndex).to.be(expectedIndex);
  });
}

export async function getKnowledgeBaseStatus(
  observabilityAIAssistantAPIClient: ObservabilityAIAssistantApiClient
) {
  return observabilityAIAssistantAPIClient.editor({
    endpoint: 'GET /internal/observability_ai_assistant/kb/status',
  });
}

export async function waitForKnowledgeBaseReady(
  getService: DeploymentAgnosticFtrProviderContext['getService']
) {
  const retry = getService('retry');
  const log = getService('log');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');

  await retry.tryForTime(5 * 60 * 1000, async () => {
    log.debug(`Waiting for knowledge base to be ready...`);
    const { body, status } = await getKnowledgeBaseStatus(observabilityAIAssistantAPIClient);

    const { kbState, isReIndexing, concreteWriteIndex, currentInferenceId } = body;
    if (status !== 200 || kbState !== KnowledgeBaseState.READY) {
      log.warning(`Knowledge base is not ready yet:
        Status code: ${status}
        State: ${kbState}
        isReIndexing: ${isReIndexing}
        concreteWriteIndex: ${concreteWriteIndex}
        currentInferenceId: ${currentInferenceId}`);
    }

    expect(status).to.be(200);
    expect(kbState).to.be(KnowledgeBaseState.READY);
    expect(isReIndexing).to.be(false);
    log.info(`Knowledge base is in ready state.`);
  });
}

export async function setupKnowledgeBase(
  getService: DeploymentAgnosticFtrProviderContext['getService'],
  inferenceId: string
) {
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');
  const log = getService('log');

  const statusResult = await getKnowledgeBaseStatus(observabilityAIAssistantAPIClient);

  log.debug(
    `Setting up knowledge base with inferenceId = "${inferenceId}", concreteWriteIndex = ${statusResult.body.concreteWriteIndex}, currentInferenceId = ${statusResult.body.currentInferenceId}, isReIndexing = ${statusResult.body.isReIndexing}`
  );
  const { body, status } = await observabilityAIAssistantAPIClient.admin({
    endpoint: 'POST /internal/observability_ai_assistant/kb/setup',
    params: {
      query: { inference_id: inferenceId, wait_until_complete: true },
    },
  });

  if (status !== 200) {
    log.warning(`Failed to setup knowledge base:
      Status code: ${status}
      Body: ${JSON.stringify(body, null, 2)}`);
  }

  return { body, status };
}

export async function addSampleDocsToInternalKb(
  getService: DeploymentAgnosticFtrProviderContext['getService'],
  sampleDocs: Array<Instruction & { title: string }>
) {
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');
  const es = getService('es');
  const log = getService('log');
  const retry = getService('retry');

  await observabilityAIAssistantAPIClient.editor({
    endpoint: 'POST /internal/observability_ai_assistant/kb/entries/import',
    params: {
      body: {
        entries: sampleDocs,
      },
    },
  });

  await refreshKbIndex(es);

  await retry.try(async () => {
    const itemsInKb = await getKnowledgeBaseEntriesFromEs(es);
    log.debug(
      `Waiting for at least ${sampleDocs.length} docs to be available for search in KB. Currently ${itemsInKb.length} docs available.`
    );
    expect(itemsInKb.length >= sampleDocs.length).to.be(true);
  });
}

// refresh the index to make sure the documents are searchable
export function refreshKbIndex(es: Client) {
  return es.indices.refresh({ index: resourceNames.indexPatterns.kb });
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
  const writeIndex = Object.entries(response).find(
    ([index, aliasInfo]) => aliasInfo.aliases[resourceNames.writeIndexAlias.kb]?.is_write_index
  )?.[0];

  if (!writeIndex) {
    throw new Error(`Could not find write index for alias ${resourceNames.writeIndexAlias.kb}`);
  }

  return writeIndex;
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

export async function reIndexKnowledgeBase(
  observabilityAIAssistantAPIClient: ObservabilityAIAssistantApiClient
) {
  return observabilityAIAssistantAPIClient.admin({
    endpoint: 'POST /internal/observability_ai_assistant/kb/reindex',
  });
}

interface SemanticTextField {
  semantic_text: string;
  _inference_fields: {
    semantic_text: {
      inference: {
        inference_id: string;
        chunks: {
          semantic_text: Array<{
            embeddings:
              | Record<string, number> // sparse embedding
              | number[]; // dense embedding;
          }>;
        };
      };
    };
  };
}

export async function getKnowledgeBaseEntriesFromEs(es: Client, size = 1000) {
  const res = await es.search<KnowledgeBaseEntry & SemanticTextField>({
    size,
    index: resourceNames.writeIndexAlias.kb,
    // Add fields parameter to include inference metadata
    fields: ['_inference_fields'],
    query: {
      match_all: {},
    },
  });

  return res.hits.hits;
}

export async function addKnowledgeBaseEntryToEs(es: Client, entry: KnowledgeBaseEntry) {
  const result = await es.index({
    index: resourceNames.writeIndexAlias.kb,
    document: entry,
    refresh: true,
  });

  return result;
}

export function getKnowledgeBaseEntriesFromApi({
  observabilityAIAssistantAPIClient,
  query = '',
  sortBy = 'title',
  sortDirection = 'asc',
}: {
  observabilityAIAssistantAPIClient: ObservabilityAIAssistantApiClient;
  query?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}) {
  return observabilityAIAssistantAPIClient.editor({
    endpoint: 'GET /internal/observability_ai_assistant/kb/entries',
    params: { query: { query, sortBy, sortDirection } },
  });
}
