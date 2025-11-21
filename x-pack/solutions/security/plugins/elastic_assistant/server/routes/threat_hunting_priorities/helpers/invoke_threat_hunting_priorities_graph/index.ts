/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import type {
  ElasticsearchClient,
  KibanaRequest,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { ApiConfig, Replacements } from '@kbn/elastic-assistant-common';
import { ActionsClientLlm, getDefaultArguments } from '@kbn/langchain/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import { getLangSmithTracer } from '@kbn/langchain/server/tracers/langsmith';

import type { RiskScoreDataClient } from '@kbn/security-solution-plugin/server/lib/entity_analytics/risk_score/risk_score_data_client';
import { getDefaultThreatHuntingPrioritiesGraph } from '../../../../lib/entity_prioritization/graphs/default_entity_prioritization_graph';
import {
  THREAT_HUNTING_PRIORITIES_GRAPH_RUN_NAME,
  THREAT_HUNTING_PRIORITIES_TAG,
} from '../../../../lib/entity_prioritization/graphs/default_entity_prioritization_graph/constants';
import { getLlmType } from '../../../utils';
import { getThreatHuntingPrioritiesPrompts } from '../../../../lib/entity_prioritization/graphs/default_entity_prioritization_graph/prompts';
import type { ThreatHuntingPrioritiesGraphState } from '../../../../lib/entity_prioritization/graphs/default_entity_prioritization_graph/state';
import type { ThreatHuntingPriority } from '../../../../lib/entity_prioritization/state';
import type { EntityDetailsHighlightsService } from '../../../../lib/entity_prioritization/graphs/default_entity_prioritization_graph/nodes/enrich_entities/types';

export interface InvokeThreatHuntingPrioritiesGraphParams {
  actionsClient: PublicMethodsOf<ActionsClient>;
  apiConfig: ApiConfig;
  connectorTimeout: number;
  end?: string;
  entityDetailsHighlightsService?: EntityDetailsHighlightsService;
  esClient: ElasticsearchClient;
  filter?: Record<string, unknown>;
  langSmithProject?: string;
  langSmithApiKey?: string;
  latestReplacements: Replacements;
  logger: Logger;
  namespace?: string; // Space ID for risk score queries
  onNewReplacements: (newReplacements: Replacements) => void;
  request?: KibanaRequest; // Required for anomalies data
  riskScoreDataClient?: RiskScoreDataClient;
  savedObjectsClient: SavedObjectsClientContract;
  start?: string;
}

export const invokeThreatHuntingPrioritiesGraph = async ({
  actionsClient,
  apiConfig,
  connectorTimeout,
  end,
  entityDetailsHighlightsService,
  esClient,
  filter,
  langSmithProject,
  langSmithApiKey,
  latestReplacements,
  logger,
  namespace,
  onNewReplacements,
  request,
  riskScoreDataClient,
  savedObjectsClient,
  start,
}: InvokeThreatHuntingPrioritiesGraphParams): Promise<{
  priorities: ThreatHuntingPriority[] | null;
}> => {
  const llmType = getLlmType(apiConfig.actionTypeId);
  const model = apiConfig.model;
  const tags = [THREAT_HUNTING_PRIORITIES_TAG, llmType, model].flatMap((tag) => tag ?? []);

  const traceOptions = {
    projectName: langSmithProject,
    tracers: [
      ...getLangSmithTracer({
        apiKey: langSmithApiKey,
        projectName: langSmithProject,
        logger,
      }),
    ],
  };

  const llm = new ActionsClientLlm({
    actionsClient,
    connectorId: apiConfig.connectorId,
    llmType,
    logger,
    model,
    // Use default temperature for the LLM type to support models that don't allow temperature: 0
    // Structured JSON output should still work with the default temperature if prompts are well-designed
    temperature: getDefaultArguments(llmType).temperature,
    timeout: connectorTimeout,
    traceOptions,
    telemetryMetadata: {
      pluginId: 'security_threat_hunting_priorities',
    },
  });

  if (llm == null) {
    throw new Error('LLM is required for threat hunting priorities');
  }

  const prompts = await getThreatHuntingPrioritiesPrompts();

  const graph = getDefaultThreatHuntingPrioritiesGraph({
    end,
    entityDetailsHighlightsService,
    esClient,
    filter,
    llm,
    logger,
    namespace,
    onNewReplacements,
    prompts,
    request,
    replacements: latestReplacements,
    riskScoreDataClient,
    start,
  });

  logger?.debug(
    () => 'invokeThreatHuntingPrioritiesGraph: invoking the Threat hunting priorities graph'
  );

  const result: ThreatHuntingPrioritiesGraphState = await graph.invoke(
    {},
    {
      callbacks: [...(traceOptions?.tracers ?? [])],
      runName: THREAT_HUNTING_PRIORITIES_GRAPH_RUN_NAME,
      tags,
    }
  );

  const {
    priorities,
    errors,
    generationAttempts,
    hallucinationFailures,
    maxGenerationAttempts,
    maxHallucinationFailures,
  } = result;

  // Log errors if any
  if (errors && errors.length > 0) {
    logger?.warn(() => `Threat hunting priorities graph completed with ${errors.length} errors`);
    errors.forEach((error) => logger?.error(() => error));
  }

  // Log if we hit max attempts or hallucination failures
  if (generationAttempts >= maxGenerationAttempts) {
    logger?.warn(
      () =>
        `Threat hunting priorities graph reached max generation attempts (${maxGenerationAttempts})`
    );
  }
  if (hallucinationFailures >= maxHallucinationFailures) {
    logger?.warn(
      () =>
        `Threat hunting priorities graph reached max hallucination failures (${maxHallucinationFailures})`
    );
  }

  return { priorities };
};
