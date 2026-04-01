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
import type { InferenceClient } from '@kbn/inference-common';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { Document } from '@langchain/core/documents';
import type { IEventLogger } from '@kbn/event-log-plugin/server';
import {
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_ALERT_RETRIEVAL_STARTED,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_ALERT_RETRIEVAL_SUCCEEDED,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATE_STEP_STARTED,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATE_STEP_SUCCEEDED,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_VALIDATION_STARTED,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_VALIDATION_SUCCEEDED,
  writeAttackDiscoveryEvent,
} from '@kbn/discoveries';

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
  eventLogger?: IEventLogger;
  eventLogIndex?: string;
  executionUuid: string;
  inferenceClient?: InferenceClient;
  logger: Logger;
  savedObjectsClient: SavedObjectsClientContract;
  spaceId?: string;
  telemetry: AnalyticsServiceSetup;
  withReplacements: boolean;
}

/**
 * Helper to write step events to the event log.
 * Only writes if all required event logging dependencies are provided.
 */
const writeStepEvent = async ({
  action,
  alertsContextCount,
  authenticatedUser,
  connectorId,
  dataClient,
  eventLogIndex,
  eventLogger,
  executionUuid,
  logger,
  message,
  newAlerts,
  spaceId,
}: {
  action: string;
  alertsContextCount?: number;
  authenticatedUser: AuthenticatedUser;
  connectorId: string;
  dataClient: AttackDiscoveryDataClient;
  eventLogIndex?: string;
  eventLogger?: IEventLogger;
  executionUuid: string;
  logger: Logger;
  message: string;
  newAlerts?: number;
  spaceId?: string;
}): Promise<void> => {
  if (!eventLogger || !eventLogIndex || !spaceId) {
    logger.debug(`[LEGACY] Skipping step event ${action}: event logging not configured`);
    return;
  }

  try {
    await writeAttackDiscoveryEvent({
      action: action as Parameters<typeof writeAttackDiscoveryEvent>[0]['action'],
      alertsContextCount,
      authenticatedUser,
      connectorId,
      dataClient,
      eventLogIndex,
      eventLogger,
      executionUuid,
      message,
      newAlerts,
      spaceId,
    });
    logger.debug(`[LEGACY] Wrote step event: ${action} for ${executionUuid}`);
  } catch (error) {
    logger.warn(`[LEGACY] Failed to write step event ${action}: ${error.message}`);
  }
};

export const generateAndUpdateAttackDiscoveries = async ({
  actionsClient,
  authenticatedUser,
  config,
  dataClient,
  enableFieldRendering,
  esClient,
  eventLogger,
  eventLogIndex,
  executionUuid,
  inferenceClient,
  logger,
  savedObjectsClient,
  spaceId,
  telemetry,
  withReplacements,
}: GenerateAndUpdateAttackDiscoveriesParams): Promise<{
  anonymizedAlerts?: Document[];
  attackDiscoveries?: AttackDiscoveryApiAlert[];
  error?: { message?: string }; // for compatibility with legacy internal API error handling
  replacements?: Replacements;
}> => {
  const traceId = `[trace: ${executionUuid}]`;
  logger.info(`[LEGACY] generateAndUpdateAttackDiscoveries started ${traceId}`);

  const startTime = moment(); // start timing the generation

  // get parameters from the request body
  const { alertsIndexPattern, apiConfig, connectorName, end, filter, replacements, size, start } =
    config;

  let latestReplacements: Replacements = { ...replacements };
  const connectorId = apiConfig.connectorId;

  try {
    // In the legacy path, the graph combines alert retrieval and LLM generation
    // into a single operation. We emit both "started" events before the call
    // since they effectively begin together.

    // Step 1: Alert Retrieval - started
    await writeStepEvent({
      action: ATTACK_DISCOVERY_EVENT_LOG_ACTION_ALERT_RETRIEVAL_STARTED,
      authenticatedUser,
      connectorId,
      dataClient,
      eventLogIndex,
      eventLogger,
      executionUuid,
      logger,
      message: `Alert retrieval started for generation ${executionUuid}`,
      spaceId,
    });

    // Step 2: Generation - started (emitted now because graph combines retrieval + generation)
    await writeStepEvent({
      action: ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATE_STEP_STARTED,
      authenticatedUser,
      connectorId,
      dataClient,
      eventLogIndex,
      eventLogger,
      executionUuid,
      logger,
      message: `Generation step started for ${executionUuid}`,
      spaceId,
    });

    // The graph call performs both alert retrieval AND LLM generation as a combined operation
    const {
      anonymizedAlerts,
      attackDiscoveries,
      replacements: generatedReplacements,
    } = await generateAttackDiscoveries({
      actionsClient,
      config,
      esClient,
      inferenceClient,
      logger,
      savedObjectsClient,
    });
    latestReplacements = generatedReplacements;

    // Step 1: Alert Retrieval - succeeded (alerts have been fetched and anonymized)
    await writeStepEvent({
      action: ATTACK_DISCOVERY_EVENT_LOG_ACTION_ALERT_RETRIEVAL_SUCCEEDED,
      alertsContextCount: anonymizedAlerts.length,
      authenticatedUser,
      connectorId,
      dataClient,
      eventLogIndex,
      eventLogger,
      executionUuid,
      logger,
      message: `Alert retrieval succeeded for generation ${executionUuid}: ${anonymizedAlerts.length} alerts`,
      spaceId,
    });

    // Step 2: Generation - succeeded (graph returned discoveries)
    await writeStepEvent({
      action: ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATE_STEP_SUCCEEDED,
      alertsContextCount: anonymizedAlerts.length,
      authenticatedUser,
      connectorId,
      dataClient,
      eventLogIndex,
      eventLogger,
      executionUuid,
      logger,
      message: `Generation step succeeded for ${executionUuid}: ${
        attackDiscoveries?.length ?? 0
      } discoveries`,
      spaceId,
    });

    logger.info(
      `[LEGACY] Generation completed: ${attackDiscoveries?.length ?? 0} discoveries, ${
        anonymizedAlerts.length
      } alerts ${traceId}`
    );

    const alertsContextCount = anonymizedAlerts.length;

    // Step 3: Validation (filtering, deduplication, persistence)
    // Write validation-started event
    await writeStepEvent({
      action: ATTACK_DISCOVERY_EVENT_LOG_ACTION_VALIDATION_STARTED,
      alertsContextCount,
      authenticatedUser,
      connectorId,
      dataClient,
      eventLogIndex,
      eventLogger,
      executionUuid,
      logger,
      message: `Validation started for generation ${executionUuid}`,
      spaceId,
    });

    // Filter out attack discoveries with hallucinated alert IDs
    // Some LLMs will hallucinate alert IDs that don't exist in the alerts index.
    // We query Elasticsearch to verify all alert IDs exist before persisting discoveries.
    logger.info(`[LEGACY] Filtering hallucinated alerts ${traceId}`);
    const validDiscoveries = await filterHallucinatedAlerts({
      alertsIndexPattern,
      attackDiscoveries: attackDiscoveries ?? [],
      esClient,
      logger,
    });
    logger.info(
      `[LEGACY] After hallucination filter: ${validDiscoveries.length}/${
        attackDiscoveries?.length ?? 0
      } discoveries remain ${traceId}`
    );

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
    logger.info(`[LEGACY] Deduplicating discoveries against index ${indexPattern} ${traceId}`);
    const dedupedDiscoveries = await deduplicateAttackDiscoveries({
      esClient,
      attackDiscoveries: validDiscoveries,
      connectorId,
      indexPattern,
      logger,
      ownerInfo: {
        id: authenticatedUser.username ?? authenticatedUser.profile_uid,
        isSchedule: false,
      },
      replacements: latestReplacements,
      spaceId: dataClient.spaceId,
    });
    const duplicatesDroppedCount = validDiscoveries.length - dedupedDiscoveries.length;
    logger.info(
      `[LEGACY] After deduplication: ${dedupedDiscoveries.length}/${validDiscoveries.length} discoveries remain ${traceId}`
    );

    reportAttackDiscoverySuccessTelemetry({
      anonymizedAlerts,
      apiConfig,
      attackDiscoveries,
      duplicatesDroppedCount,
      hasFilter: !!(filter && Object.keys(filter).length),
      end,
      latestReplacements,
      logger,
      size,
      start,
      startTime,
      telemetry,
    });

    const createAttackDiscoveryAlertsParams: CreateAttackDiscoveryAlertsParams = {
      alertsContextCount,
      anonymizedAlerts: anonymizedAlerts as Array<{
        id?: string;
        metadata: Record<string, never>;
        pageContent: string;
      }>, // TODO: remove this when the generator returns metadata: z.record(z.string(), z.unknown()) instead of metadata: z.object({}),
      apiConfig,
      attackDiscoveries: dedupedDiscoveries,
      connectorName: connectorName ?? connectorId,
      enableFieldRendering,
      generationUuid: executionUuid,
      replacements: latestReplacements,
      withReplacements,
    };

    logger.info(
      `[LEGACY] Calling createAttackDiscoveryAlerts with ${dedupedDiscoveries.length} discoveries ${traceId}`
    );
    const storedAttackDiscoveries = await dataClient.createAttackDiscoveryAlerts({
      authenticatedUser,
      createAttackDiscoveryAlertsParams,
    });
    logger.info(
      `[LEGACY] createAttackDiscoveryAlerts returned ${
        storedAttackDiscoveries?.length ?? 0
      } discoveries ${traceId}`
    );

    // Write validation-succeeded event with the persisted discovery count.
    // This is the count that the UI aggregates via max(alert_counts.new).
    await writeStepEvent({
      action: ATTACK_DISCOVERY_EVENT_LOG_ACTION_VALIDATION_SUCCEEDED,
      alertsContextCount,
      authenticatedUser,
      connectorId,
      dataClient,
      eventLogIndex,
      eventLogger,
      executionUuid,
      logger,
      message: `Validation succeeded for generation ${executionUuid}: ${
        storedAttackDiscoveries?.length ?? 0
      } discoveries persisted`,
      newAlerts: storedAttackDiscoveries?.length ?? 0,
      spaceId,
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
