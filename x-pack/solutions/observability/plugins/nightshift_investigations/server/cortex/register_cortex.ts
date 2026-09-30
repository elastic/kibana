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
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { ContextEnginePluginSetup } from '@kbn/context-engine-plugin/server';
import {
  NightshiftModelBlockedError,
  NIGHTSHIFT_USAGE_PARENT_ID,
  NIGHTSHIFT_USAGE_PRODUCT_FEATURE,
  NIGHTSHIFT_USAGE_PRODUCT_SOLUTION,
  NIGHTSHIFT_INVESTIGATION_MEMORY_USAGE_ID,
} from '@kbn/significant-events-schema';
import { i18n } from '@kbn/i18n';
import type { SandboxSession } from '@kbn/sandbox-plugin/server';
import { resolveNightshiftModelForRequest } from '@kbn/nightshift-ai';
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
// progress reports) would spend its transcript budget and count towards the minimum.
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
  /**
   * Only the Nightshift investigator writes to Cortex: it is the one agent whose post-execution
   * hook runs this workflow, and other agents' rounds must not edit the wiki. An unidentified
   * caller is refused rather than trusted because the optimize workflow has a manual trigger.
   */
  if (agentId !== NIGHTSHIFT_INVESTIGATION_AGENT_ID) {
    logger.debug(
      'Cortex optimizer skipped — round was not produced by the Nightshift investigator'
    );
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

  const inference = getInference();
  const savedObjects = getSavedObjects();
  const uiSettings = getUiSettings();
  if (!inference || !savedObjects || !uiSettings) {
    logger.debug('Cortex optimizer skipped — model resolution is unavailable');
    return;
  }

  let connectorId: string;
  try {
    connectorId = await resolveNightshiftModelForRequest({
      request,
      inference,
      savedObjects,
      uiSettings,
      step: 'investigation',
      requestedId: requestedConnectorId,
      roundConnectorId,
      onFallback: (reason) =>
        logger.warn(`Cortex round model is unavailable, using the default: ${reason.message}`),
    });
  } catch (error) {
    if (error instanceof NightshiftModelBlockedError) {
      logger.error(error);
    }
    throw error;
  }

  const store = createCortexStore({ esClient, logger, spaceId, signal });
  const inferenceClient = inference.getClient({
    request,
    bindTo: {
      connectorId,
      metadata: {
        connectorTelemetry: {
          pluginId: NIGHTSHIFT_INVESTIGATION_MEMORY_USAGE_ID,
          aggregateBy: NIGHTSHIFT_USAGE_PARENT_ID,
          productSolution: NIGHTSHIFT_USAGE_PRODUCT_SOLUTION,
          productFeature: NIGHTSHIFT_USAGE_PRODUCT_FEATURE,
          interactionId,
        },
      },
    },
  });
  await optimizeCortex({
    store,
    proposeEdits: createLlmProposeCortexEdits({ inferenceClient }),
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
