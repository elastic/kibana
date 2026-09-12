/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, Logger } from '@kbn/core/server';
import type { IEventLogger } from '@kbn/event-log-plugin/server';

import {
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_SUCCEEDED,
  writeAttackDiscoveryEvent,
  type AttackDiscoverySource,
  type SourceMetadata,
} from '../../../../persistence/event_logging';
import { getDurationNanoseconds } from '../../../../../lib/persistence';
import type { AlertRetrievalResult } from '../../../invoke_alert_retrieval_workflow';
import type { ParsedApiConfig } from '../../../types';
import type { NoAlertsOutcome } from '../../steps/validation_step';

export interface HandleNoAlertsParams {
  alertRetrievalResult: AlertRetrievalResult;
  apiConfig: ParsedApiConfig;
  authenticatedUser: AuthenticatedUser;
  eventLogger: IEventLogger;
  eventLogIndex: string;
  executionUuid: string;
  generationWorkflowId: string;
  logger: Logger;
  source?: AttackDiscoverySource;
  sourceMetadata?: SourceMetadata;
  spaceId: string;
  startTime: Date;
}

/**
 * Handles the zero-alert short-circuit: alert retrieval returned no alerts, so
 * generation (the LLM call) and validation are both skipped. A
 * `generation-succeeded` event with zero alerts and zero discoveries is written
 * so the UI reaches a terminal "succeeded" state (the overall generation status
 * drives the terminal transition) and clearly shows that no alerts were
 * available to analyze.
 */
export const handleNoAlerts = async ({
  alertRetrievalResult,
  apiConfig,
  authenticatedUser,
  eventLogger,
  eventLogIndex,
  executionUuid,
  generationWorkflowId,
  logger,
  source,
  sourceMetadata,
  spaceId,
  startTime,
}: HandleNoAlertsParams): Promise<NoAlertsOutcome> => {
  logger.info(
    `Skipping generation and validation: alert retrieval returned 0 alerts (execution_uuid=${executionUuid})`
  );

  const endTime = new Date();

  try {
    await writeAttackDiscoveryEvent({
      action: ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_SUCCEEDED,
      alertsContextCount: 0,
      authenticatedUser,
      connectorId: apiConfig.connector_id,
      dataClient: null,
      duration: getDurationNanoseconds({ end: endTime, start: startTime }),
      end: endTime,
      eventLogger,
      eventLogIndex,
      executionUuid,
      message: `Attack discovery generation ${executionUuid} succeeded with no alerts to analyze`,
      outcome: 'success',
      source,
      sourceMetadata,
      spaceId,
      start: startTime,
      workflowExecutions: {
        alertRetrieval:
          alertRetrievalResult.workflowExecutions.length > 0
            ? alertRetrievalResult.workflowExecutions
            : null,
        gate:
          alertRetrievalResult.gateExecutions != null &&
          alertRetrievalResult.gateExecutions.length > 0
            ? alertRetrievalResult.gateExecutions
            : null,
        generation: null,
        validation: null,
      },
      workflowId: generationWorkflowId,
    });
  } catch (error) {
    logger.error(
      `Failed to write generation-succeeded event for no-alerts outcome: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  return {
    alertRetrievalResult,
    outcome: 'no_alerts',
  };
};
