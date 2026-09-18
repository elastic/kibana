/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import type { ContextEnginePluginSetup } from '@kbn/context-engine-plugin/server';
import { SIGNIFICANT_EVENTS_INVESTIGATION_INFERENCE_FEATURE_ID } from '@kbn/significant-events-schema';
import { i18n } from '@kbn/i18n';
import { MEMORY_AI_INDEX_DEST, MEMORY_AI_INDEX_ID } from '../../common/memory';
import { NIGHTSHIFT_DEDUCTIVE_INVESTIGATION_AGENT_ID } from '../agents/deductive_investigation';
import type { SandboxSession } from '@kbn/sandbox-plugin/server';
import { materializeMemory, readRecalledIds } from './materialize';
import {
  createLlmProposeMemoryExtractions,
  createLlmProposeMemoryLabels,
  optimizeMemory,
} from './optimize';
import { createMemoryPageStore, type MemoryPageStore } from './page_store';

export const createMemoryStore = ({
  esClient,
  logger,
  spaceId,
  signal,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  spaceId: string;
  signal?: AbortSignal;
}): MemoryPageStore => createMemoryPageStore({ esClient, logger, spaceId, signal });

export const registerMemoryAiIndex = (
  contextEngine: ContextEnginePluginSetup | undefined,
  logger: Logger
): void => {
  if (!contextEngine) {
    logger.debug(
      'contextEngine is not available — Semantic Memory AI index will not be registered'
    );
    return;
  }

  contextEngine.registerAiIndex(MEMORY_AI_INDEX_ID, {
    description: i18n.translate('xpack.nightshiftInvestigations.memory.aiIndexDescription', {
      defaultMessage:
        'Nightshift Semantic Memory - prior incidents, failure modes, and operational learnings.',
    }),
    dest: { type: 'index', value: MEMORY_AI_INDEX_DEST },
    automations: [],
    sources: [],
  });
};

export const hydrateMemoryWorkspace = async ({
  session,
  esClient,
  spaceId,
  query,
  signal,
  logger,
}: {
  session: SandboxSession;
  esClient: ElasticsearchClient;
  spaceId: string;
  query?: string;
  signal?: AbortSignal;
  logger: Logger;
}): Promise<void> => {
  const store = createMemoryStore({ esClient, logger, spaceId, signal });
  await materializeMemory({ session, store, logger, query });
};

const loadRecalledIds = async ({
  session,
  logger,
}: {
  session?: SandboxSession;
  logger: Logger;
}): Promise<string[]> => {
  if (!session) {
    logger.debug('Memory optimizer has no sandbox conversation — recalled set is empty');
    return [];
  }

  try {
    return await readRecalledIds({ session });
  } catch (err) {
    logger.debug(`Memory optimizer could not read .recalled.json: ${(err as Error).message}`);
    return [];
  }
};

export const runMemoryOptimize = async ({
  request,
  agentId,
  userMessage,
  assistantMessage,
  session,
  esClient,
  spaceId,
  signal,
  getInference,
  getSearchInferenceEndpoints,
  logger,
}: {
  request: KibanaRequest;
  agentId?: string;
  userMessage: string;
  assistantMessage: string;
  session?: SandboxSession;
  esClient: ElasticsearchClient;
  spaceId: string;
  signal?: AbortSignal;
  getInference: () => InferenceServerStart | undefined;
  getSearchInferenceEndpoints: () => SearchInferenceEndpointsPluginStart | undefined;
  logger: Logger;
}): Promise<void> => {
  if (agentId !== NIGHTSHIFT_DEDUCTIVE_INVESTIGATION_AGENT_ID) {
    logger.debug('Memory optimizer skipped — round was not produced by the deductive investigator');
    return;
  }

  const inference = getInference();
  const searchInferenceEndpoints = getSearchInferenceEndpoints();
  if (!inference || !searchInferenceEndpoints) {
    logger.debug('Memory optimizer skipped — inference or connectors unavailable');
    return;
  }

  const { endpoints } = await searchInferenceEndpoints.endpoints.getForFeature(
    SIGNIFICANT_EVENTS_INVESTIGATION_INFERENCE_FEATURE_ID,
    request
  );
  const connectorId = endpoints[0]?.connectorId;
  if (!connectorId) {
    logger.debug('Memory optimizer skipped — no investigation inference connector');
    return;
  }

  const store = createMemoryStore({ esClient, logger, spaceId, signal });
  const inferenceClient = inference.getClient({ request });
  const recalledIds = await loadRecalledIds({ session, logger });
  await optimizeMemory({
    store,
    recalledIds,
    proposeLabels: createLlmProposeMemoryLabels({ inferenceClient, connectorId }),
    proposeExtractions: createLlmProposeMemoryExtractions({ inferenceClient, connectorId }),
    userMessage,
    assistantMessage,
    logger,
  });
};
