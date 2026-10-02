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
import type { SandboxSession } from '@kbn/sandbox-plugin/server';
import {
  createInvestigationOptimizeTelemetry,
  createOptimizeModel,
} from '../lib/create_optimize_model';
import { CORTEX_AI_INDEX_DEST, CORTEX_AI_INDEX_ID } from '../../common/cortex';
import { NIGHTSHIFT_INVESTIGATION_AGENT_ID, SANDBOX_TOOL_IDS } from '../agents/investigation';
import type { InvestigationToolCall } from '../decision_trees/accessed_trees';
import { createCortexTelemetry } from '../telemetry';
import { materializeCortex } from './materialize';
import { createLlmProposeCortexEdits, optimizeCortex } from './optimize';
import { createCortexPageStore, type CortexPageStore } from './page_store';

export const createCortexStore = ({
  esClient,
  logger,
  spaceId,
  signal,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  spaceId: string;
  signal?: AbortSignal;
}): CortexPageStore => createCortexPageStore({ esClient, logger, spaceId, signal });

export const registerCortexAiIndex = (
  contextEngine: ContextEnginePluginSetup | undefined,
  logger: Logger
): void => {
  if (!contextEngine) {
    logger.debug('contextEngine is not available — Cortex AI index will not be registered');
    return;
  }

  contextEngine.registerAiIndex(CORTEX_AI_INDEX_ID, {
    description: i18n.translate('xpack.nightshiftInvestigations.cortex.aiIndexDescription', {
      defaultMessage:
        'Nightshift Cortex wiki pages — durable, cross-linked knowledge the investigator reads before each run.',
    }),
    dest: { type: 'index', value: CORTEX_AI_INDEX_DEST },
    automations: [],
    sources: [],
    traces: [],
  });
};

/** Rounds with fewer tool calls rarely establish anything durable, e.g. chat replies or smoke tests. */
const MIN_OPTIMIZE_TOOL_CALLS = 3;

// Only sandbox calls carry the queries and files the optimizer learns from; the rest (e.g.
// recording hypotheses) would spend its transcript budget and count towards the minimum.
const OPTIMIZER_TOOL_IDS: ReadonlySet<string> = new Set(SANDBOX_TOOL_IDS);

/** gRPC status the sandbox session rethrows when its pod refuses or drops the connection. */
const GRPC_UNAVAILABLE = 14;

const isSandboxUnavailable = (err: unknown): err is Error & { code: number } =>
  err instanceof Error && (err as Error & { code?: number }).code === GRPC_UNAVAILABLE;

export const hydrateCortexWorkspace = async ({
  session,
  esClient,
  spaceId,
  signal,
  analytics,
  conversationId,
  logger,
}: {
  session: SandboxSession;
  esClient: ElasticsearchClient;
  spaceId: string;
  signal?: AbortSignal;
  analytics: AnalyticsServiceSetup;
  conversationId?: string;
  logger: Logger;
}): Promise<void> => {
  const store = createCortexStore({ esClient, logger, spaceId, signal });
  const telemetry = createCortexTelemetry({ analytics, conversationId, logger });
  const materialize = () => materializeCortex({ session, store, telemetry, logger });

  try {
    await materialize();
  } catch (err) {
    if (!isSandboxUnavailable(err) || signal?.aborted) throw err;

    // Hydrate is usually the conversation's first sandbox call, so it is the one that reaches a
    // freshly allocated pod before that pod accepts connections. The sandbox drops the session on
    // UNAVAILABLE and allocates a new pod for the next call, so a single retry lands on a pod
    // that is ready. Without it the run continues with no wiki, because nothing else seeds it.
    logger.warn(`Cortex hydrate reached an unavailable sandbox, retrying once: ${err.message}`);
    await materialize();
  }
};

export const runCortexOptimize = async ({
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
  requestedConnectorId?: string;
  roundConnectorId?: string;
  getInference: () => InferenceServerStart | undefined;
  getSavedObjects: () => CoreStart['savedObjects'] | undefined;
  getUiSettings: () => CoreStart['uiSettings'] | undefined;
  logger: Logger;
}): Promise<void> => {
  // Only the Nightshift investigator writes to Cortex: it is the one agent whose post-execution
  // hook runs this workflow, and other agents' rounds must not edit the wiki. An unidentified
  // caller is refused rather than trusted — the optimize workflow has a manual trigger, so it can
  // be run without an agent id.
  if (agentId !== NIGHTSHIFT_INVESTIGATION_AGENT_ID) {
    logger.info('Cortex optimizer skipped — round was not produced by the Nightshift investigator');
    return;
  }

  const sandboxToolCalls = toolCalls.filter(
    ({ tool_id: toolId }) => toolId !== undefined && OPTIMIZER_TOOL_IDS.has(toolId)
  );
  if (sandboxToolCalls.length < MIN_OPTIMIZE_TOOL_CALLS) {
    logger.debug(
      `Cortex optimizer skipped — round made ${sandboxToolCalls.length} sandbox tool calls, below ${MIN_OPTIMIZE_TOOL_CALLS}`
    );
    return;
  }

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
    return;
  }

  const store = createCortexStore({ esClient, logger, spaceId, signal });
  await optimizeCortex({
    store,
    proposeEdits: createLlmProposeCortexEdits({ inferenceClient: model.inferenceClient }),
    userMessage,
    assistantMessage,
    toolCalls: sandboxToolCalls,
    telemetry: createCortexTelemetry({
      analytics,
      conversationId,
      roundId,
      logger,
    }),
    logger,
  });
};
