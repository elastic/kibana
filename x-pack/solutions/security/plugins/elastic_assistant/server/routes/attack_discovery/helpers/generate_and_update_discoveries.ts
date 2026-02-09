/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import type {
  AnalyticsServiceSetup,
  AuthenticatedUser,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type {
  AttackDiscoveryApiAlert,
  AttackDiscoveryGenerationConfig,
  CreateAttackDiscoveryAlertsParams,
  Replacements,
} from '@kbn/elastic-assistant-common';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { Document } from '@langchain/core/documents';

import { deduplicateAttackDiscoveries } from '../../../lib/attack_discovery/persistence/deduplication';
import { reportAttackDiscoverySuccessTelemetry } from './report_attack_discovery_success_telemetry';
import { handleGraphError } from '../public/post/helpers/handle_graph_error';
import type { AttackDiscoveryDataClient } from '../../../lib/attack_discovery/persistence';
import { filterHallucinatedAlerts } from './filter_hallucinated_alerts';
import { generateAttackDiscoveries } from './generate_discoveries';

export interface GenerateAndUpdateAttackDiscoveriesParams {
  actionsClient: PublicMethodsOf<ActionsClient>;
  authenticatedUser: AuthenticatedUser;
  config: AttackDiscoveryGenerationConfig;
  dataClient: AttackDiscoveryDataClient;
  enableFieldRendering: boolean;
  esClient: ElasticsearchClient;
  executionUuid: string;
  logger: Logger;
  savedObjectsClient: SavedObjectsClientContract;
  telemetry: AnalyticsServiceSetup;
  withReplacements: boolean;
}

export const generateAndUpdateAttackDiscoveries = async ({
  actionsClient,
  authenticatedUser,
  config,
  dataClient,
  enableFieldRendering,
  esClient,
  executionUuid,
  logger,
  savedObjectsClient,
  telemetry,
  withReplacements,
}: GenerateAndUpdateAttackDiscoveriesParams): Promise<{
  anonymizedAlerts?: Document[];
  attackDiscoveries?: AttackDiscoveryApiAlert[];
  error?: { message?: string }; // for compatibility with legacy internal API error handling
  replacements?: Replacements;
}> => {
  const startTime = moment(); // start timing the generation

  // get parameters from the request body
  const { alertsIndexPattern, apiConfig, connectorName, end, filter, replacements, size, start } =
    config;

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

    reportAttackDiscoverySuccessTelemetry({
      anonymizedAlerts,
      apiConfig,
      attackDiscoveries,
      hasFilter: !!(filter && Object.keys(filter).length),
      end,
      latestReplacements,
      logger,
      size,
      start,
      startTime,
      telemetry,
    });

    const alertsContextCount = anonymizedAlerts.length;

    // Filter out attack discoveries with hallucinated alert IDs
    // Some LLMs will hallucinate alert IDs that don't exist in the alerts index.
    // We query Elasticsearch to verify all alert IDs exist before persisting discoveries.
    const validDiscoveries = await filterHallucinatedAlerts({
      alertsIndexPattern,
      attackDiscoveries: attackDiscoveries ?? [],
      esClient,
      logger,
    });

    /**
     * Deduplicate attackDiscoveries before creating alerts
     *
     * We search for duplicates within the ad hoc index only,
     * because there will be no duplicates in the scheduled index due to the
     * fact that we use schedule ID (for the schedules) and
     * user ID (for the ad hoc generations) as part of the alert ID hash
     * generated for the deduplication purposes
     */
    const indexPattern = dataClient.getAdHocAlertsIndexPattern();
    const dedupedDiscoveries = await deduplicateAttackDiscoveries({
      esClient,
      attackDiscoveries: validDiscoveries,
      connectorId: apiConfig.connectorId,
      indexPattern,
      logger,
      ownerInfo: {
        id: authenticatedUser.username ?? authenticatedUser.profile_uid,
        isSchedule: false,
      },
      replacements: latestReplacements,
      spaceId: dataClient.spaceId,
    });

    const createAttackDiscoveryAlertsParams: CreateAttackDiscoveryAlertsParams = {
      alertsContextCount,
      anonymizedAlerts,
      apiConfig,
      attackDiscoveries: dedupedDiscoveries,
      connectorName: connectorName ?? apiConfig.connectorId,
      enableFieldRendering,
      generationUuid: executionUuid,
      replacements: latestReplacements,
      withReplacements,
    };
    const storedAttackDiscoveries = await dataClient.createAttackDiscoveryAlerts({
      authenticatedUser,
      createAttackDiscoveryAlertsParams,
    });

    return {
      anonymizedAlerts,
      attackDiscoveries: storedAttackDiscoveries,
      replacements: latestReplacements,
    };
  } catch (err) {
    await handleGraphError({
      apiConfig,
      err,
      logger,
      telemetry,
    });
    return { error: err };
  }
};
