/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { ApiConfig, AttackDiscovery, Replacements } from '@kbn/elastic-assistant-common';
import type { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas';
import { ActionsClientLlm } from '@kbn/langchain/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import { getLangSmithTracer } from '@kbn/langchain/server/tracers/langsmith';
import type { Document } from '@langchain/core/documents';

import type { AttackDiscoveryGraphState } from '../../../../../../lib/langchain/graphs';
import { getDefaultAttackDiscoveryGraph } from '../../../../../../lib/attack_discovery/graphs/default_attack_discovery_graph';
import {
  ATTACK_DISCOVERY_GRAPH_RUN_NAME,
  ATTACK_DISCOVERY_TAG,
} from '../../../../../../lib/attack_discovery/graphs/default_attack_discovery_graph/constants';
import { throwIfErrorCountsExceeded } from '../throw_if_error_counts_exceeded';
import { throwIfInvalidAnonymization } from '../throw_if_invalid_anonymization';
import { getLlmType } from '../../../../../utils';
import { getAttackDiscoveryPrompts } from '../../../../../../lib/attack_discovery/graphs/default_attack_discovery_graph/prompts';

export const invokeAttackDiscoveryGraph = async ({
  actionsClient,
  alertsIndexPattern,
  anonymizationFields,
  apiConfig,
  connectorTimeout,
  end,
  esClient,
  filter,
  langSmithProject,
  langSmithApiKey,
  latestReplacements,
  logger,
  onNewReplacements,
  savedObjectsClient,
  size,
  start,
}: {
  actionsClient: PublicMethodsOf<ActionsClient>;
  alertsIndexPattern: string;
  anonymizationFields: AnonymizationFieldResponse[];
  apiConfig: ApiConfig;
  connectorTimeout: number;
  end?: string;
  esClient: ElasticsearchClient;
  filter?: Record<string, unknown>;
  langSmithProject?: string;
  langSmithApiKey?: string;
  latestReplacements: Replacements;
  logger: Logger;
  onNewReplacements: (newReplacements: Replacements) => void;
  savedObjectsClient: SavedObjectsClientContract;
  start?: string;
  size: number;
}): Promise<{
  anonymizedAlerts: Document[];
  attackDiscoveries: AttackDiscovery[] | null;
}> => {
  throwIfInvalidAnonymization(anonymizationFields);

  const llmType = getLlmType(apiConfig.actionTypeId);
  const model = apiConfig.model;
  const tags = [ATTACK_DISCOVERY_TAG, llmType, model].flatMap((tag) => tag ?? []);

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
    temperature: 0, // zero temperature for attack discovery, because we want structured JSON output
    timeout: connectorTimeout,
    traceOptions,
    telemetryMetadata: {
      pluginId: 'security_attack_discovery',
    },
  });

  if (llm == null) {
    throw new Error('LLM is required for attack discoveries');
  }

  const attackDiscoveryPrompts = await getAttackDiscoveryPrompts({
    actionsClient,
    connectorId: apiConfig.connectorId,
    // if in future oss has different prompt, add it as model here
    model,
    provider: llmType,
    savedObjectsClient,
  });

  const graph = getDefaultAttackDiscoveryGraph({
    alertsIndexPattern,
    anonymizationFields,
    end,
    esClient,
    filter,
    llm,
    logger,
    onNewReplacements,
    prompts: attackDiscoveryPrompts,
    replacements: latestReplacements,
    size,
    start,
  });

  logger?.debug(() => 'invokeAttackDiscoveryGraph: invoking the Attack discovery graph');

  const result: AttackDiscoveryGraphState = await graph.invoke(
    {},
    {
      callbacks: [...(traceOptions?.tracers ?? [])],
      runName: ATTACK_DISCOVERY_GRAPH_RUN_NAME,
      tags,
    }
  );

  const {
    insights: attackDiscoveries,
    anonymizedDocuments: anonymizedAlerts,
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

  return { anonymizedAlerts, attackDiscoveries };
};
