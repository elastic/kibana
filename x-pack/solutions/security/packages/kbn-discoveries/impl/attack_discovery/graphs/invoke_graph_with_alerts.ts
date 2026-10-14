/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Document } from '@langchain/core/documents';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { AttackDiscovery, Replacements } from '@kbn/elastic-assistant-common';
import type { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas';
import type { InferenceClient } from '@kbn/inference-common';
import { ActionsClientLlm } from '@kbn/langchain/server';
import { getLangSmithTracer } from '@kbn/langchain/server/tracers/langsmith';
import type { AttackDiscoveryGraphState } from '../../lib/types';
import type { CombinedPrompts } from '.';
import {
  ATTACK_DISCOVERY_GRAPH_RUN_NAME,
  ATTACK_DISCOVERY_TAG,
  getDefaultAttackDiscoveryGraph,
} from '.';
import { getLlmType } from '../../lib/helpers/get_llm_type';
import { throwIfErrorCountsExceeded } from './throw_if_error_counts_exceeded';

export interface InvokeAttackDiscoveryGraphWithAlertsParams {
  abortSignal?: AbortSignal;
  actionsClient: PublicMethodsOf<ActionsClient>;
  additionalContext?: string;
  alerts: Document[];
  alertsIndexPattern?: string;
  anonymizationFields?: AnonymizationFieldResponse[];
  apiConfig: {
    action_type_id: string;
    connector_id: string;
    model?: string;
  };
  connectorTimeout: number;
  end?: string;
  esClient: ElasticsearchClient;
  filter?: Record<string, unknown>;
  inferenceClient?: InferenceClient;
  langSmithApiKey?: string;
  langSmithProject?: string;
  logger: Logger;
  prompts: CombinedPrompts;
  replacements?: Replacements;
  size?: number;
  start?: string;
}

export interface InvokeGraphResult {
  alertsContextCount: number;
  discoveries: AttackDiscovery[] | null;
  replacements: Replacements;
}

/**
 * Orchestrates Attack Discovery graph execution with pre-retrieved alerts.
 *
 * Prompts are provided by the calling plugin (discoveries) using
 * its prompt management system (@kbn/security-ai-prompts with local fallbacks).
 *
 * This keeps the package independent of any specific prompt storage mechanism.
 */
export const invokeAttackDiscoveryGraphWithAlerts = async ({
  abortSignal,
  actionsClient,
  additionalContext,
  alerts,
  alertsIndexPattern,
  anonymizationFields = [],
  apiConfig,
  connectorTimeout,
  end,
  esClient,
  filter,
  inferenceClient,
  langSmithApiKey,
  langSmithProject,
  logger,
  prompts,
  replacements = {},
  size = 10,
  start,
}: InvokeAttackDiscoveryGraphWithAlertsParams): Promise<InvokeGraphResult> => {
  const { action_type_id: actionTypeId, connector_id: connectorId, model } = apiConfig;

  const llmType = getLlmType(actionTypeId);
  const isInferenceEndpoint = actionTypeId === '.inference' && inferenceClient != null;

  const llm = new ActionsClientLlm({
    actionsClient,
    connectorId,
    inferenceClient: isInferenceEndpoint ? inferenceClient : undefined,
    isInferenceEndpoint,
    llmType,
    logger,
    model,
    temperature: 0,
    timeout: connectorTimeout,
    traceOptions: {
      projectName: langSmithProject,
      tracers: getLangSmithTracer({
        apiKey: langSmithApiKey,
        logger,
        projectName: langSmithProject,
      }),
    },
  });

  const graph = getDefaultAttackDiscoveryGraph({
    alertsIndexPattern,
    anonymizationFields,
    end,
    esClient,
    filter,
    llm,
    logger,
    onNewReplacements: (newReplacements) => {
      Object.assign(replacements, newReplacements);
    },
    prompts,
    replacements,
    size,
    start,
  });

  logger.debug(() => `Invoking Attack Discovery graph with ${alerts.length} pre-retrieved alerts`);

  // Check if already aborted before starting graph execution
  if (abortSignal?.aborted) {
    throw new Error('Graph execution aborted before starting');
  }

  const promptWithAdditionalContext =
    additionalContext != null && additionalContext.length > 0
      ? `${prompts.default}\n\nAdditional context:\n${additionalContext}`
      : undefined;

  const result: AttackDiscoveryGraphState = await graph.invoke(
    {
      anonymizedDocuments: alerts,
      ...(promptWithAdditionalContext != null ? { prompt: promptWithAdditionalContext } : {}),
      replacements,
    },
    {
      callbacks: langSmithProject
        ? getLangSmithTracer({
            apiKey: langSmithApiKey,
            logger,
            projectName: langSmithProject,
          })
        : [],
      runName: ATTACK_DISCOVERY_GRAPH_RUN_NAME,
      signal: abortSignal,
      tags: [ATTACK_DISCOVERY_TAG, llmType, model].filter(Boolean) as string[],
    }
  );

  logger.debug(() => `Graph execution completed: ${result.insights?.length ?? 0} discoveries`);

  const {
    errors,
    generationAttempts,
    hallucinationFailures,
    maxGenerationAttempts,
    maxHallucinationFailures,
  } = result;

  throwIfErrorCountsExceeded({
    errors,
    generationAttempts,
    hallucinationFailures,
    logger,
    maxGenerationAttempts,
    maxHallucinationFailures,
  });

  return {
    alertsContextCount: result.anonymizedDocuments.length,
    discoveries: result.insights,
    replacements: result.replacements,
  };
};
