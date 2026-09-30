/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { SandboxSession } from '@kbn/sandbox-plugin/server';
import {
  createInvestigationOptimizeTelemetry,
  createOptimizeModel,
} from '../lib/create_optimize_model';
import { SANDBOX_TOOL_IDS } from '../agents/investigation';
import type { InvestigationToolCall } from '../decision_trees/accessed_trees';
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
  signal,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  spaceId: string;
  signal?: AbortSignal;
}): MemoryPageStore => {
  return createMemoryPageStore({ esClient, logger, spaceId, signal });
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
  const store = createMemoryStore({ esClient, logger, spaceId, signal });
  logger.debug(
    `Memory hydrate space=${spaceId} agent=${agentId} query=${JSON.stringify(previewText(query))}`
  );
  return materializeMemory({ session, store, logger, query });
};

const OPTIMIZER_TOOL_IDS: ReadonlySet<string> = new Set(SANDBOX_TOOL_IDS);

export const runMemoryOptimize = async ({
  request,
  agentId,
  userMessage,
  assistantMessage,
  toolCalls,
  recalledIds,
  esClient,
  spaceId,
  signal,
  getAgentBuilder,
  logger,
  connectorId: requestedConnectorId,
  interactionId,
}: {
  request: KibanaRequest;
  agentId?: string;
  userMessage: string;
  assistantMessage: string;
  toolCalls: InvestigationToolCall[];
  recalledIds: string[];
  esClient: ElasticsearchClient;
  spaceId: string;
  signal?: AbortSignal;
  getAgentBuilder: () => AgentBuilderPluginStart | undefined;
  logger: Logger;
  connectorId?: string;
  interactionId: string;
}): Promise<MemoryOptimizeSummary | undefined> => {
  logger.debug(
    `Memory optimize wiring space=${spaceId} agent=${agentId} ` +
      `connector=${requestedConnectorId ?? '(agent default)'} ` +
      `recalledIds=${recalledIds.length} toolCalls=${toolCalls.length} userChars=${userMessage.length} ` +
      `assistantChars=${assistantMessage.length} user=${JSON.stringify(previewText(userMessage))}`
  );

  const model = await createOptimizeModel({
    request,
    connectorId: requestedConnectorId,
    agentBuilder: getAgentBuilder(),
    telemetryMetadata: createInvestigationOptimizeTelemetry(interactionId),
    logger,
  });
  if (!model) {
    return undefined;
  }

  const store = createMemoryStore({ esClient, logger, spaceId, signal });
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
    // Same filter as Cortex: progress reports and other non-sandbox calls carry no environment facts.
    toolCalls: toolCalls.filter(
      ({ tool_id: toolId }) => toolId !== undefined && OPTIMIZER_TOOL_IDS.has(toolId)
    ),
    logger,
  });
};
