/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import {
  AnalyticsServiceSetup,
  AuthenticatedUser,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { AttackDiscoveryGenerationConfig, Replacements } from '@kbn/elastic-assistant-common';
import { PublicMethodsOf } from '@kbn/utility-types';
import { ActionsClient } from '@kbn/actions-plugin/server';

import { updateAttackDiscoveries } from './helpers';
import { handleGraphError } from '../post/helpers/handle_graph_error';
import { invokeAttackDiscoveryGraph } from '../post/helpers/invoke_attack_discovery_graph';
import { AttackDiscoveryDataClient } from '../../../lib/attack_discovery/persistence';

const ROUTE_HANDLER_TIMEOUT = 10 * 60 * 1000; // 10 * 60 seconds = 10 minutes
const LANG_CHAIN_TIMEOUT = ROUTE_HANDLER_TIMEOUT - 10_000; // 9 minutes 50 seconds
const CONNECTOR_TIMEOUT = LANG_CHAIN_TIMEOUT - 10_000; // 9 minutes 40 seconds

export interface GenerateAttackDiscoveriesParams {
  actionsClient: PublicMethodsOf<ActionsClient>;
  authenticatedUser: AuthenticatedUser;
  config: AttackDiscoveryGenerationConfig;
  dataClient: AttackDiscoveryDataClient;
  esClient: ElasticsearchClient;
  executionUuid: string;
  logger: Logger;
  savedObjectsClient: SavedObjectsClientContract;
  telemetry: AnalyticsServiceSetup;
}

export const generateAttackDiscoveries = async ({
  actionsClient,
  authenticatedUser,
  config,
  dataClient,
  esClient,
  executionUuid,
  logger,
  savedObjectsClient,
  telemetry,
}: GenerateAttackDiscoveriesParams) => {
  const startTime = moment(); // start timing the generation

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

  try {
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

    await updateAttackDiscoveries({
      anonymizedAlerts,
      apiConfig,
      attackDiscoveries,
      executionUuid,
      authenticatedUser,
      dataClient,
      hasFilter: !!(filter && Object.keys(filter).length),
      end,
      latestReplacements,
      logger,
      size,
      start,
      startTime,
      telemetry,
    });

    return { anonymizedAlerts, attackDiscoveries, replacements: latestReplacements };
  } catch (err) {
    await handleGraphError({
      apiConfig,
      executionUuid,
      authenticatedUser,
      dataClient,
      err,
      latestReplacements,
      logger,
      telemetry,
    });
    return { error: err };
  }
};
