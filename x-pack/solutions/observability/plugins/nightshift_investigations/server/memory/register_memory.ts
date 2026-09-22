/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { SandboxSession } from '@kbn/sandbox-plugin/server';
import { NIGHTSHIFT_DEDUCTIVE_INVESTIGATION_AGENT_ID } from '../agents/deductive_investigation';
import { createOptimizeModel } from '../lib/create_optimize_model';
import { previewText } from './log_format';
import { materializeMemory, readRecalledIds, type MaterializeMemoryResult } from './materialize';
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
  agentId,
  signal,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  agentId: string;
  signal?: AbortSignal;
}): MemoryPageStore => createMemoryPageStore({ esClient, logger, agentId, signal });

export const hydrateMemoryWorkspace = async ({
  session,
  esClient,
  agentId,
  query,
  signal,
  logger,
}: {
  session: SandboxSession;
  esClient: ElasticsearchClient;
  agentId: string;
  query?: string;
  signal?: AbortSignal;
  logger: Logger;
}): Promise<MaterializeMemoryResult> => {
  const store = createMemoryStore({ esClient, logger, agentId, signal });
  logger.debug(`Memory hydrate agent=${agentId} query=${JSON.stringify(previewText(query))}`);
  return materializeMemory({ session, store, logger, query });
};

const loadRecalledIds = async ({
  session,
  logger,
}: {
  session?: SandboxSession;
  logger: Logger;
}): Promise<string[]> => {
  if (!session) {
    logger.info('Memory optimizer has no sandbox conversation — recalled set is empty');
    return [];
  }

  try {
    const ids = await readRecalledIds({ session });
    logger.info(`Memory optimizer recalled sidecar: ${ids.length} id(s)`);
    logger.debug(`Memory optimizer sidecar ids: ${ids.join(', ') || '(none)'}`);
    return ids;
  } catch (err) {
    logger.info(`Memory optimizer could not read .recalled.json: ${(err as Error).message}`);
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
  getAgentBuilder,
  logger,
  connectorId: requestedConnectorId,
}: {
  request: KibanaRequest;
  agentId?: string;
  userMessage: string;
  assistantMessage: string;
  session?: SandboxSession;
  esClient: ElasticsearchClient;
  spaceId: string;
  signal?: AbortSignal;
  getAgentBuilder: () => AgentBuilderPluginStart | undefined;
  logger: Logger;
  connectorId?: string;
}): Promise<MemoryOptimizeSummary | undefined> => {
  if (agentId !== NIGHTSHIFT_DEDUCTIVE_INVESTIGATION_AGENT_ID) {
    logger.info('Memory optimizer skipped — round was not produced by the deductive investigator');
    logger.debug(
      `Memory optimize skip agent=${agentId ?? '(missing)'} ` +
        `expected=${NIGHTSHIFT_DEDUCTIVE_INVESTIGATION_AGENT_ID}`
    );
    return undefined;
  }

  logger.debug(
    `Memory optimize wiring space=${spaceId} agent=${agentId} ` +
      `connector=${requestedConnectorId ?? '(agent default)'} ` +
      `hasSession=${Boolean(session)} userChars=${userMessage.length} ` +
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

  const store = createMemoryStore({ esClient, logger, agentId, signal });
  const recalledIds = await loadRecalledIds({ session, logger });
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
