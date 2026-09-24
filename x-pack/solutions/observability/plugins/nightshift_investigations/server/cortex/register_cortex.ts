/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AnalyticsServiceSetup,
  ElasticsearchClient,
  KibanaRequest,
  Logger,
} from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import type { ContextEnginePluginSetup } from '@kbn/context-engine-plugin/server';
import {
  SIGNIFICANT_EVENTS_INFERENCE_PARENT_FEATURE_ID,
  SIGNIFICANT_EVENTS_INVESTIGATION_INFERENCE_FEATURE_ID,
} from '@kbn/significant-events-schema';
import { i18n } from '@kbn/i18n';
import type { SandboxSession } from '@kbn/sandbox-plugin/server';
import { CORTEX_AI_INDEX_DEST, CORTEX_AI_INDEX_ID } from '../../common/cortex';
import { NIGHTSHIFT_INVESTIGATION_AGENT_ID } from '../agents/investigation';
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
  esClient,
  spaceId,
  signal,
  analytics,
  conversationId,
  roundId,
  getInference,
  getSearchInferenceEndpoints,
  logger,
}: {
  request: KibanaRequest;
  agentId?: string;
  userMessage: string;
  assistantMessage: string;
  esClient: ElasticsearchClient;
  spaceId: string;
  signal?: AbortSignal;
  analytics: AnalyticsServiceSetup;
  conversationId?: string;
  roundId?: string;
  getInference: () => InferenceServerStart | undefined;
  getSearchInferenceEndpoints: () => SearchInferenceEndpointsPluginStart | undefined;
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

  const inference = getInference();
  const searchInferenceEndpoints = getSearchInferenceEndpoints();
  if (!inference || !searchInferenceEndpoints) {
    logger.debug('Cortex optimizer skipped — inference or connectors unavailable');
    return;
  }

  const { endpoints } = await searchInferenceEndpoints.endpoints.getForFeature(
    SIGNIFICANT_EVENTS_INVESTIGATION_INFERENCE_FEATURE_ID,
    request
  );
  const connectorId = endpoints[0]?.connectorId;
  if (!connectorId) {
    logger.debug('Cortex optimizer skipped — no investigation inference connector');
    return;
  }

  const store = createCortexStore({ esClient, logger, spaceId, signal });
  const inferenceClient = inference.getClient({
    request,
    bindTo: {
      connectorId,
      metadata: {
        connectorTelemetry: {
          pluginId: SIGNIFICANT_EVENTS_INVESTIGATION_INFERENCE_FEATURE_ID,
          aggregateBy: SIGNIFICANT_EVENTS_INFERENCE_PARENT_FEATURE_ID,
        },
      },
    },
  });
  await optimizeCortex({
    store,
    proposeEdits: createLlmProposeCortexEdits({ inferenceClient }),
    userMessage,
    assistantMessage,
    telemetry: createCortexTelemetry({
      analytics,
      conversationId,
      roundId,
      logger,
    }),
    logger,
  });
};
