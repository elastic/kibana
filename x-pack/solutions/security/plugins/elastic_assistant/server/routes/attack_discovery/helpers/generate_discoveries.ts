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

const ROUTE_HANDLER_TIMEOUT = 10 * 60 * 1000; // 10 * 60 seconds = 10 minutes
const LANG_CHAIN_TIMEOUT = ROUTE_HANDLER_TIMEOUT - 10_000; // 9 minutes 50 seconds
const CONNECTOR_TIMEOUT = LANG_CHAIN_TIMEOUT - 10_000; // 9 minutes 40 seconds

export interface GenerateAttackDiscoveriesParams {
  actionsClient: PublicMethodsOf<ActionsClient>;
  config: AttackDiscoveryGenerationConfig;
  esClient: ElasticsearchClient;
  logger: Logger;
  savedObjectsClient: SavedObjectsClientContract;
}

export const generateAttackDiscoveries = async ({
  actionsClient,
  config,
  esClient,
  logger,
  savedObjectsClient,
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
