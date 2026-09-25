/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { SandboxSession } from '@kbn/sandbox-plugin/server';
import { NIGHTSHIFT_INVESTIGATION_AGENT_ID } from '../agents/investigation';
import { createOptimizeModel } from '../lib/create_optimize_model';
import { previewText } from './log_format';
import { materializeMemory, type MaterializeMemoryResult } from './materialize';
import {
  createLlmProposeMemoryExtractions,
  createLlmProposeMemoryLabels,
  createLlmSynthesizeMemoryGroup,
  optimizeMemory,
  type MemoryOptimizeSummary,
} from './optimize';
import { createMemoryPageStore, type MemoryPageStore } from './page_store';

export const createMemoryStore = ({
  esClient,
  logger,
  spaceId,
  agentId,
  signal,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  spaceId: string;
  agentId: string;
  signal?: AbortSignal;
}): MemoryPageStore => {
  if (agentId !== NIGHTSHIFT_INVESTIGATION_AGENT_ID) {
    throw new Error('Semantic Memory is only available to the Nightshift investigator');
  }
  return createMemoryPageStore({ esClient, logger, spaceId, agentId, signal });
};

export const hydrateMemoryWorkspace = async ({
  session,
  esClient,
  spaceId,
  agentId,
  query,
  signal,
  logger,
}: {
  session: SandboxSession;
  esClient: ElasticsearchClient;
  spaceId: string;
  agentId: string;
  query?: string;
  signal?: AbortSignal;
  logger: Logger;
}): Promise<MaterializeMemoryResult> => {
  const store = createMemoryStore({ esClient, logger, spaceId, agentId, signal });
  logger.debug(
    `Memory hydrate space=${spaceId} agent=${agentId} query=${JSON.stringify(previewText(query))}`
  );
  return materializeMemory({ session, store, logger, query });
};

export const runMemoryOptimize = async ({
  request,
  agentId,
  userMessage,
  assistantMessage,
  recalledIds,
  esClient,
  spaceId,
  signal,
  getAgentBuilder,
  logger,
  connectorId: requestedConnectorId,
}: {
  request: KibanaRequest;
  agentId?: string;
  userMessage: string;
  assistantMessage: string;
  recalledIds: string[];
  esClient: ElasticsearchClient;
  spaceId: string;
  signal?: AbortSignal;
  getAgentBuilder: () => AgentBuilderPluginStart | undefined;
  logger: Logger;
  connectorId?: string;
}): Promise<MemoryOptimizeSummary | undefined> => {
  if (agentId !== NIGHTSHIFT_INVESTIGATION_AGENT_ID) {
    logger.info('Memory optimizer skipped — round was not produced by the Nightshift investigator');
    logger.debug(
      `Memory optimize skip agent=${agentId ?? '(missing)'} ` +
        `expected=${NIGHTSHIFT_INVESTIGATION_AGENT_ID}`
    );
    return undefined;
  }

  logger.debug(
    `Memory optimize wiring space=${spaceId} agent=${agentId} ` +
      `connector=${requestedConnectorId ?? '(agent default)'} ` +
      `recalledIds=${recalledIds.length} userChars=${userMessage.length} ` +
      `assistantChars=${assistantMessage.length} user=${JSON.stringify(previewText(userMessage))}`
  );

  const model = await createOptimizeModel({
    request,
    connectorId: requestedConnectorId,
    agentBuilder: getAgentBuilder(),
    logger,
  });
  if (!model) {
    return undefined;
  }

  const store = createMemoryStore({ esClient, logger, spaceId, agentId, signal });
  return optimizeMemory({
    store,
    recalledIds,
    proposeLabels: createLlmProposeMemoryLabels({ inferenceClient: model.inferenceClient }),
    proposeExtractions: createLlmProposeMemoryExtractions({
      inferenceClient: model.inferenceClient,
    }),
    synthesizeMemoryGroup: createLlmSynthesizeMemoryGroup({
      inferenceClient: model.inferenceClient,
    }),
    userMessage,
    assistantMessage,
    logger,
  });
};
