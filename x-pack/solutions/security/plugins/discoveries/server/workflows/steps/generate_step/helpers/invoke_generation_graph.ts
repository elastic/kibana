/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { alertsToDocuments } from '@kbn/discoveries/impl/lib/types';

import type { Replacements } from '@kbn/elastic-assistant-common';
import type { InferenceClient } from '@kbn/inference-common';
import { getLlmType } from '@kbn/discoveries/impl/lib/helpers/get_llm_type';
import { invokeAttackDiscoveryGraphWithAlerts } from '@kbn/discoveries/impl/attack_discovery/graphs/invoke_graph_with_alerts';
import { getAttackDiscoveryPrompts } from '../../../../lib/attack_discovery/prompts';

export const invokeGenerationGraph = async ({
  abortSignal,
  actionsClient,
  additionalContext,
  apiConfig,
  connectorTimeout,
  esClient,
  inferenceClient,
  langSmithApiKey,
  langSmithProject,
  logger,
  replacements,
  savedObjectsClient,
  size,
  sourceAlerts,
}: {
  abortSignal?: AbortSignal;
  actionsClient: PublicMethodsOf<ActionsClient>;
  additionalContext?: string;
  apiConfig: {
    action_type_id: string;
    connector_id: string;
    model?: string;
  };
  connectorTimeout: number;
  esClient: ElasticsearchClient;
  inferenceClient?: InferenceClient;
  langSmithApiKey?: string;
  langSmithProject?: string;
  logger: Logger;
  replacements?: Replacements;
  savedObjectsClient: SavedObjectsClientContract;
  size?: number;
  sourceAlerts: string[];
}) => {
  const anonymizedDocuments = alertsToDocuments(sourceAlerts);

  const prompts = await getAttackDiscoveryPrompts({
    connectorId: apiConfig.connector_id,
    model: apiConfig.model,
    provider: getLlmType(apiConfig.action_type_id),
    savedObjectsClient,
  });

  return await invokeAttackDiscoveryGraphWithAlerts({
    abortSignal,
    actionsClient,
    additionalContext,
    alerts: anonymizedDocuments,
    apiConfig,
    connectorTimeout,
    esClient,
    inferenceClient,
    langSmithApiKey,
    langSmithProject,
    logger,
    prompts,
    replacements,
    size,
  });
};
