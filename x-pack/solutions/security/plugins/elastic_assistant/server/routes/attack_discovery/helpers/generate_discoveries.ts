/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { AttackDiscoveryGenerationConfig, Replacements } from '@kbn/elastic-assistant-common';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ActionsClient } from '@kbn/actions-plugin/server';

import { invokeAttackDiscoveryGraph } from '../public/post/helpers/invoke_attack_discovery_graph';
import { invokeIncrementalAttackDiscovery } from '../public/post/helpers/invoke_incremental_attack_discovery';

const ROUTE_HANDLER_TIMEOUT = 10 * 60 * 1000; // 10 * 60 seconds = 10 minutes
const LANG_CHAIN_TIMEOUT = ROUTE_HANDLER_TIMEOUT - 10_000; // 9 minutes 50 seconds
const CONNECTOR_TIMEOUT = LANG_CHAIN_TIMEOUT - 10_000; // 9 minutes 40 seconds

export interface GenerateAttackDiscoveriesParams {
  actionsClient: PublicMethodsOf<ActionsClient>;
  config: AttackDiscoveryGenerationConfig;
  esClient: ElasticsearchClient;
  logger: Logger;
  savedObjectsClient: SavedObjectsClientContract;
  incrementalMode?: 'delta' | 'progressive';
  sessionId?: string;
  incrementalConfig?: {
    alertsPerRound?: number;
    maxRounds?: number;
    mergeStrategy?: 'rule-based';
    similarityThreshold?: number;
  };
}

export const generateAttackDiscoveries = async ({
  actionsClient,
  config,
  esClient,
  logger,
  savedObjectsClient,
  incrementalMode,
  sessionId,
  incrementalConfig,
}: GenerateAttackDiscoveriesParams) => {
  // get parameters from the request body
  const alertsIndexPattern = decodeURIComponent(config.alertsIndexPattern);
  const {
    apiConfig,
    anonymizationFields,
    end,
    filter,
    langSmithApiKey,
    langSmithProject,
    replacements,
    size,
    start,
  } = config;

  // callback to accumulate the latest replacements:
  let latestReplacements: Replacements = { ...replacements };
  const onNewReplacements = (newReplacements: Replacements) => {
    latestReplacements = { ...latestReplacements, ...newReplacements };
  };

  // Branch based on incremental mode
  if (incrementalMode === 'delta' || incrementalMode === 'progressive') {
    logger.info(`Using incremental attack discovery in ${incrementalMode} mode`);

    const { anonymizedAlerts, attackDiscoveries } = await invokeIncrementalAttackDiscovery({
      actionsClient,
      alertsIndexPattern,
      anonymizationFields,
      apiConfig,
      connectorTimeout: CONNECTOR_TIMEOUT,
      end,
      esClient,
      filter,
      incrementalConfig: incrementalConfig ?? {},
      langSmithProject,
      langSmithApiKey,
      latestReplacements,
      logger,
      mode: incrementalMode,
      onNewReplacements,
      savedObjectsClient,
      sessionId: sessionId ?? `ad-session-${Date.now()}`,
      size,
      start,
    });

    return { anonymizedAlerts, attackDiscoveries, replacements: latestReplacements };
  }

  // Standard (non-incremental) mode
  const { anonymizedAlerts, attackDiscoveries } = await invokeAttackDiscoveryGraph({
    actionsClient,
    alertsIndexPattern,
    anonymizationFields,
    apiConfig,
    connectorTimeout: CONNECTOR_TIMEOUT,
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
  });

  return { anonymizedAlerts, attackDiscoveries, replacements: latestReplacements };
};
