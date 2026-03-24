/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type {
  Instruction,
  KnowledgeBaseEntry,
} from '@kbn/observability-ai-assistant-plugin/common/types';
import { InferenceModelState } from '@kbn/observability-ai-assistant-plugin/common/types';
import { resourceNames } from '@kbn/observability-ai-assistant-plugin/server/service';
import expect from '@kbn/expect';
import pRetry from 'p-retry';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import type { ObservabilityAIAssistantApiClient } from '../../../../services/observability_ai_assistant_api';

export async function clearKnowledgeBase(
  getService: DeploymentAgnosticFtrProviderContext['getService']
) {
  const es = getService('es');

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
    const { inferenceModelState, isReIndexing } = body;

    if (status !== 200 || inferenceModelState !== InferenceModelState.READY) {
      log.warning(`Knowledge base is not ready yet.`);
    }

    expect(status).to.be(200);
    expect(inferenceModelState).to.be(InferenceModelState.READY);
    expect(isReIndexing).to.be(false);

    log.info('Knowledge base is in ready state.');
  });
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

export function refreshKbIndex(es: Client) {
  return es.indices.refresh({ index: resourceNames.indexPatterns.kb });
}

export async function setupKnowledgeBase(
  getService: DeploymentAgnosticFtrProviderContext['getService'],
  inferenceId: string
) {
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');
  const log = getService('log');
  const { body, status } = await observabilityAIAssistantAPIClient.admin({
    endpoint: 'POST /internal/observability_ai_assistant/kb/setup',
    params: { query: { inference_id: inferenceId, wait_until_complete: true } },
  });

  if (status !== 200) {
    log.warning(`Failed to setup knowledge base (status ${status})`);
  }

  return { body, status };
}

export async function getKnowledgeBaseEntriesFromEs(es: Client, size = 1000) {
  const res = await es.search<KnowledgeBaseEntry>({
    size,
    index: resourceNames.writeIndexAlias.kb,
    query: { match_all: {} },
  });

  return res.hits.hits;
}

export async function getConcreteWriteIndexFromAlias(es: Client) {
  const response = await es.indices.getAlias({ index: resourceNames.writeIndexAlias.kb });
  const writeIndex = Object.entries(response).find(
    ([, aliasInfo]) => aliasInfo.aliases[resourceNames.writeIndexAlias.kb]?.is_write_index
  )?.[0];

  if (!writeIndex) {
    throw new Error(`Could not find write index for alias ${resourceNames.writeIndexAlias.kb}`);
  }

  return writeIndex;
}
