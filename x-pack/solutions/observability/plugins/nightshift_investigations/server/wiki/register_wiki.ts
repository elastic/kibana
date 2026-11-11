/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AnalyticsServiceSetup,
  CoreStart,
  ElasticsearchClient,
  KibanaRequest,
  Logger,
} from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { ContextEnginePluginSetup } from '@kbn/context-engine-plugin/server';
import { i18n } from '@kbn/i18n';
import type { AuditedSandboxSession } from '../sandbox_audit';
import {
  createInvestigationMemoryTelemetry,
  createOptimizeModel,
} from '../lib/create_optimize_model';
import { WIKI_AI_INDEX_DEST, WIKI_AI_INDEX_ID } from '../../common/wiki';
import { SANDBOX_TOOL_IDS } from '../agents/investigation';
import { usesKnowledge } from '../agents/agent_policy';
import type { InvestigationToolCall } from '../decision_trees/accessed_trees';
import {
  extractWorkspaceReads,
  loadInvestigationRound,
  type AppliedWriteRecord,
} from '../investigation_round';
import { createWikiTelemetry } from '../telemetry';
import { materializeWiki } from './materialize';
import { createLlmProposeWikiEdits, optimizeWiki } from './optimize';
import { createWikiPageStore, type WikiPageStore } from './page_store';
import { classifyWikiRound, shouldOptimizeRound } from './round_kind';

export const createWikiStore = ({
  esClient,
  logger,
  spaceId,
  signal,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  spaceId: string;
  signal?: AbortSignal;
}): WikiPageStore => createWikiPageStore({ esClient, logger, spaceId, signal });

export const registerWikiAiIndex = (
  contextEngine: ContextEnginePluginSetup | undefined,
  logger: Logger
): void => {
  if (!contextEngine) {
    logger.debug('contextEngine is not available — Wiki AI index will not be registered');
    return;
  }

  contextEngine.registerAiIndex(WIKI_AI_INDEX_ID, {
    description: i18n.translate('xpack.nightshiftInvestigations.wiki.aiIndexDescription', {
      defaultMessage:
        'Nightshift Wiki pages — durable, cross-linked knowledge the investigator reads before each run.',
    }),
    dest: { type: 'index', value: WIKI_AI_INDEX_DEST },
    automations: [],
    sources: [],
    traces: [],
  });
};

// Only sandbox calls carry the queries and files the optimizer learns from; the rest (e.g.
// recording hypotheses) would spend its transcript budget and count towards the minimum.
const OPTIMIZER_TOOL_IDS: ReadonlySet<string> = new Set(SANDBOX_TOOL_IDS);

/** gRPC status the sandbox session rethrows when its pod refuses or drops the connection. */
const GRPC_UNAVAILABLE = 14;

const isSandboxUnavailable = (err: unknown): err is Error & { code: number } =>
  err instanceof Error && (err as Error & { code?: number }).code === GRPC_UNAVAILABLE;

export const hydrateWikiWorkspace = async ({
  session,
  esClient,
  spaceId,
  signal,
  analytics,
  conversationId,
  logger,
}: {
  session: AuditedSandboxSession;
  esClient: ElasticsearchClient;
  spaceId: string;
  signal?: AbortSignal;
  analytics: AnalyticsServiceSetup;
  conversationId?: string;
  logger: Logger;
}): Promise<{ hydratedIds: string[] } | void> => {
  const store = createWikiStore({ esClient, logger, spaceId, signal });
  const telemetry = createWikiTelemetry({ analytics, conversationId, logger });
  const materialize = () => materializeWiki({ session, store, telemetry, logger });

  try {
    return await materialize();
  } catch (err) {
    if (!isSandboxUnavailable(err) || signal?.aborted) throw err;

    // Hydrate is usually the conversation's first sandbox call, so it is the one that reaches a
    // freshly allocated pod before that pod accepts connections. The sandbox drops the session on
    // UNAVAILABLE and allocates a new pod for the next call, so a single retry lands on a pod
    // that is ready. Without it the run continues with no wiki, because nothing else seeds it.
    logger.warn(`Wiki hydrate reached an unavailable sandbox, retrying once: ${err.message}`);
    return await materialize();
  }
};

export interface WikiOptimizeResult {
  openedIds: string[];
  appliedWrites: AppliedWriteRecord[];
}

export const runWikiOptimize = async ({
  request,
  agentId,
  userMessage,
  assistantMessage,
  toolCalls,
  esClient,
  spaceId,
  interactionId,
  signal,
  getAgentBuilder,
  analytics,
  conversationId,
  roundId,
  roundIndex,
  requestedConnectorId,
  roundConnectorId,
  getInference,
  getSavedObjects,
  getUiSettings,
  logger,
}: {
  request: KibanaRequest;
  agentId?: string;
  userMessage: string;
  assistantMessage: string;
  toolCalls: InvestigationToolCall[];
  esClient: ElasticsearchClient;
  spaceId: string;
  interactionId: string;
  signal?: AbortSignal;
  getAgentBuilder: () => AgentBuilderPluginStart | undefined;
  analytics: AnalyticsServiceSetup;
  conversationId?: string;
  roundId?: string;
  roundIndex?: number;
  requestedConnectorId?: string;
  roundConnectorId?: string;
  getInference: () => InferenceServerStart | undefined;
  getSavedObjects: () => CoreStart['savedObjects'] | undefined;
  getUiSettings: () => CoreStart['uiSettings'] | undefined;
  logger: Logger;
}): Promise<WikiOptimizeResult | undefined> => {
  // Only the Nightshift knowledge agents write to Wiki: their post-execution hook runs this
  // workflow, and other agents' rounds must not edit the wiki. An unidentified caller is refused
  // rather than trusted — the optimize workflow has a manual trigger, so it can be run without an
  // agent id.
  if (!usesKnowledge(agentId)) {
    logger.info('Wiki optimizer skipped — round was not produced by a nightshift knowledge agent');
    return undefined;
  }

  const loadedRound = await loadInvestigationRound({
    agentBuilder: getAgentBuilder(),
    request,
    conversationId,
    roundId,
    roundIndex,
    fallbackToolCalls: toolCalls,
    logger,
    signal,
  });
  const openedIds = extractWorkspaceReads(loadedRound.steps).wikiIds;

  if (loadedRound.source === 'conversation_unreadable') {
    logger.info(
      `Wiki optimizer skipped — conversation ${conversationId} is not readable by this caller`
    );
    return;
  }

  const roundKind = classifyWikiRound({
    roundIndex: loadedRound.roundIndex ?? roundIndex,
  });
  const sandboxToolCalls = loadedRound.toolCalls.filter(
    ({ tool_id: toolId }) => toolId !== undefined && OPTIMIZER_TOOL_IDS.has(toolId)
  );
  if (
    !shouldOptimizeRound({
      roundKind,
      sandboxToolCallCount: sandboxToolCalls.length,
    })
  ) {
    logger.debug(
      `Wiki optimizer skipped — ${roundKind} round with ${sandboxToolCalls.length} sandbox tool calls has nothing durable to learn from`
    );
    return { openedIds, appliedWrites: [] };
  }

  const model = await createOptimizeModel({
    request,
    requestedConnectorId,
    roundConnectorId,
    agentBuilder: getAgentBuilder(),
    inference: getInference(),
    savedObjects: getSavedObjects(),
    uiSettings: getUiSettings(),
    telemetryMetadata: createInvestigationMemoryTelemetry(interactionId),
    logger,
  });
  if (!model) {
    return undefined;
  }

  const resolvedRoundId = loadedRound.roundId || roundId;
  const store = createWikiStore({ esClient, logger, spaceId, signal });
  const appliedWrites = await optimizeWiki({
    store,
    proposeEdits: createLlmProposeWikiEdits({ inferenceClient: model.inferenceClient }),
    userMessage,
    assistantMessage,
    toolCalls: sandboxToolCalls,
    roundKind,
    previousUserMessage: loadedRound.previousUserMessage,
    previousAssistantMessage: loadedRound.previousAssistantMessage,
    telemetry: createWikiTelemetry({
      analytics,
      conversationId,
      roundId: resolvedRoundId,
      logger,
    }),
    provenance: {
      conversationId,
      roundId: resolvedRoundId,
      workflowExecutionId: interactionId,
    },
    logger,
  });
  return { openedIds, appliedWrites };
};
