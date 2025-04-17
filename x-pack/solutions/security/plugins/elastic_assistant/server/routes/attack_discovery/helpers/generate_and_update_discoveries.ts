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
import { AttackDiscoveryDataClient } from '../../../lib/attack_discovery/persistence';
import { generateAttackDiscoveries } from './generate_discoveries';

export interface GenerateAndUpdateAttackDiscoveriesParams {
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

export const generateAndUpdateAttackDiscoveries = async ({
  actionsClient,
  authenticatedUser,
  config,
  dataClient,
  esClient,
  executionUuid,
  logger,
  savedObjectsClient,
  telemetry,
}: GenerateAndUpdateAttackDiscoveriesParams) => {
  const startTime = moment(); // start timing the generation

  // get parameters from the request body
  const { apiConfig, end, filter, replacements, size, start } = config;

  let latestReplacements: Replacements = { ...replacements };

  try {
    const {
      anonymizedAlerts,
      attackDiscoveries,
      replacements: generatedReplacements,
    } = await generateAttackDiscoveries({
      actionsClient,
      config,
      esClient,
      logger,
      savedObjectsClient,
    });
    latestReplacements = generatedReplacements;

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
