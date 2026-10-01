/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { SandboxSession } from '@kbn/sandbox-plugin/server';
import {
  createInvestigationOptimizeTelemetry,
  createOptimizeModel,
} from '../lib/create_optimize_model';
import type { InvestigationToolCall } from '../decision_trees/accessed_trees';
import { previewText } from './log_format';
import { stepsFromRound, stepsFromToolCalls, type TranscriptStep } from './transcript';
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

/**
 * Agent Builder fires the after-execution hook before it saves the round, so the workflow can
 * reach this step while the round does not exist yet. Waits briefly for it. Kept short: when the
 * workflow's request cannot read the conversation at all (Agent Builder masks that as not found),
 * a long wait would only delay the fallback.
 */
const ROUND_READ_RETRY_DELAYS_MS = [1_000, 2_000];

const sleep = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve) => {
    if (signal?.aborted) return resolve();
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      resolve();
    });
  });

/**
 * Reads the completed round's steps (reasoning, tool calls, tool results) through the public
 * Agent Builder conversation client, scoped to the workflow's own user and Space. Returns
 * `undefined` when the round cannot be read; the optimizer then works from tool-call parameters.
 * Never guesses a round: without a round id there is nothing safe to match.
 */
export const loadRoundSteps = async ({
  agentBuilder,
  request,
  conversationId,
  roundId,
  logger,
  signal,
  retryDelaysMs = ROUND_READ_RETRY_DELAYS_MS,
}: {
  agentBuilder: AgentBuilderPluginStart | undefined;
  request: KibanaRequest;
  conversationId?: string;
  roundId?: string;
  logger: Logger;
  signal?: AbortSignal;
  retryDelaysMs?: readonly number[];
}): Promise<TranscriptStep[] | undefined> => {
  if (!agentBuilder || !conversationId || !roundId) {
    return undefined;
  }
  let lastProblem = '';
  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt++) {
    if (attempt > 0) {
      await sleep(retryDelaysMs[attempt - 1], signal);
      if (signal?.aborted) break;
    }
    try {
      const client = await agentBuilder.conversations.getScopedClient({ request });
      const conversation = await client.get(conversationId);
      const round = conversation.rounds.find(({ id }) => id === roundId);
      if (round) {
        logger.debug(`Memory optimize read the round on attempt ${attempt + 1}`);
        return stepsFromRound(round.steps as Parameters<typeof stepsFromRound>[0]);
      }
      lastProblem = 'round not saved yet';
    } catch (error) {
      lastProblem = (error as Error).message;
    }
  }
  logger.warn('Memory optimize could not read the round; using the hook tool calls');
  logger.debug(`Memory optimize round read gave up: ${lastProblem}`);
  return undefined;
};

export const runMemoryOptimize = async ({
  request,
  agentId,
  userMessage,
  assistantMessage,
  toolCalls,
  conversationId,
  roundId,
  recalledIds,
  esClient,
  spaceId,
  signal,
  getAgentBuilder,
  getInference,
  getSavedObjects,
  getUiSettings,
  logger,
  requestedConnectorId,
  roundConnectorId,
  interactionId,
}: {
  request: KibanaRequest;
  agentId?: string;
  userMessage: string;
  assistantMessage: string;
  toolCalls: InvestigationToolCall[];
  conversationId?: string;
  roundId?: string;
  recalledIds: string[];
  esClient: ElasticsearchClient;
  spaceId: string;
  signal?: AbortSignal;
  getAgentBuilder: () => AgentBuilderPluginStart | undefined;
  getInference: () => InferenceServerStart | undefined;
  getSavedObjects: () => CoreStart['savedObjects'] | undefined;
  getUiSettings: () => CoreStart['uiSettings'] | undefined;
  logger: Logger;
  requestedConnectorId?: string;
  roundConnectorId?: string;
  interactionId: string;
}): Promise<MemoryOptimizeSummary | undefined> => {
  logger.debug(
    `Memory optimize wiring space=${spaceId} agent=${agentId} ` +
      `connector=${requestedConnectorId ?? '(none)'} round=${roundConnectorId ?? '(none)'} ` +
      `recalledIds=${recalledIds.length} toolCalls=${toolCalls.length} userChars=${userMessage.length} ` +
      `assistantChars=${assistantMessage.length} user=${JSON.stringify(previewText(userMessage))}`
  );

  const model = await createOptimizeModel({
    request,
    requestedConnectorId,
    roundConnectorId,
    agentBuilder: getAgentBuilder(),
    inference: getInference(),
    savedObjects: getSavedObjects(),
    uiSettings: getUiSettings(),
    telemetryMetadata: createInvestigationOptimizeTelemetry(interactionId),
    logger,
  });
  if (!model) {
    return undefined;
  }

  const investigation =
    (await loadRoundSteps({
      agentBuilder: getAgentBuilder(),
      request,
      conversationId,
      roundId,
      logger,
      signal,
    })) ?? stepsFromToolCalls(toolCalls);

  const store = createMemoryStore({ esClient, logger, spaceId, signal });
  return optimizeMemory({
    store,
    recalledIds,
    proposeLabels: createLlmProposeMemoryLabels({ inferenceClient: model.inferenceClient, signal }),
    proposeExtractions: createLlmProposeMemoryExtractions({
      inferenceClient: model.inferenceClient,
      signal,
    }),
    synthesizeMemoryGroup: createLlmSynthesizeMemoryGroup({
      inferenceClient: model.inferenceClient,
      signal,
    }),
    userMessage,
    assistantMessage,
    toolCalls,
    investigation,
    logger,
    signal,
  });
};
