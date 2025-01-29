/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { ApiConfig, AttackDiscovery, Replacements } from '@kbn/elastic-assistant-common';
import { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/bulk_crud_anonymization_fields_route.gen';
import { ActionsClientLlm } from '@kbn/langchain/server';
import { PublicMethodsOf } from '@kbn/utility-types';
import { getLangSmithTracer } from '@kbn/langchain/server/tracers/langsmith';
import type { Document } from '@langchain/core/documents';

import { getDefaultAttackDiscoveryGraph } from '../../../../../lib/attack_discovery/graphs/default_attack_discovery_graph';
import {
  ATTACK_DISCOVERY_GRAPH_RUN_NAME,
  ATTACK_DISCOVERY_TAG,
} from '../../../../../lib/attack_discovery/graphs/default_attack_discovery_graph/constants';
import { GraphState } from '../../../../../lib/attack_discovery/graphs/default_attack_discovery_graph/types';
import { throwIfErrorCountsExceeded } from '../throw_if_error_counts_exceeded';
import { getLlmType } from '../../../../utils';
import { getAttackDiscoveryPrompts } from '../../../../../lib/attack_discovery/graphs/default_attack_discovery_graph/nodes/helpers/prompts';

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
    temperature: 0, // zero temperature for attack discovery, because we want structured JSON output
    timeout: connectorTimeout,
    traceOptions,
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

  const result: GraphState = await graph.invoke(
    {},
    {
      callbacks: [...(traceOptions?.tracers ?? [])],
      runName: ATTACK_DISCOVERY_GRAPH_RUN_NAME,
      tags,
    }
  );
  const {
    attackDiscoveries,
    anonymizedAlerts,
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
