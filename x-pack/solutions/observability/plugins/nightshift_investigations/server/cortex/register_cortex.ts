/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { ContextEnginePluginSetup } from '@kbn/context-engine-plugin/server';
import { i18n } from '@kbn/i18n';
import type { SandboxSession } from '@kbn/sandbox-plugin/server';
import { createOptimizeModel } from '../lib/create_optimize_model';
import { CORTEX_AI_INDEX_DEST, CORTEX_AI_INDEX_ID } from '../../common/cortex';
import { NIGHTSHIFT_INVESTIGATION_AGENT_ID } from '../agents/investigation';
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

export const hydrateCortexWorkspace = async ({
  session,
  esClient,
  spaceId,
  signal,
  logger,
}: {
  session: SandboxSession;
  esClient: ElasticsearchClient;
  spaceId: string;
  signal?: AbortSignal;
  logger: Logger;
}): Promise<void> => {
  const store = createCortexStore({ esClient, logger, spaceId, signal });
  await materializeCortex({ session, store, logger });
};

export const runCortexOptimize = async ({
  request,
  agentId,
  userMessage,
  assistantMessage,
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
  esClient: ElasticsearchClient;
  spaceId: string;
  signal?: AbortSignal;
  getAgentBuilder: () => AgentBuilderPluginStart | undefined;
  logger: Logger;
  connectorId?: string;
}): Promise<void> => {
  // Only the Nightshift investigator writes to Cortex: it is the one agent whose post-execution
  // hook runs this workflow, and other agents' rounds must not edit the wiki. An unidentified
  // caller is refused rather than trusted — the optimize workflow has a manual trigger, so it can
  // be run without an agent id.
  if (agentId !== NIGHTSHIFT_INVESTIGATION_AGENT_ID) {
    logger.info('Cortex optimizer skipped — round was not produced by the Nightshift investigator');
    return;
  }

  const model = await createOptimizeModel({
    request,
    connectorId: requestedConnectorId,
    agentBuilder: getAgentBuilder(),
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
    logger,
  });
};
