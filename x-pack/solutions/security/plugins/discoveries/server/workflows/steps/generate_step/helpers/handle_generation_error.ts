/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, Logger } from '@kbn/core/server';
import {
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_FAILED,
  writeAttackDiscoveryEvent,
} from '@kbn/discoveries/impl/attack_discovery/persistence/event_logging';
import { getDurationNanoseconds } from '@kbn/discoveries/impl/lib/persistence';
import type { IEventLogger } from '@kbn/event-log-plugin/server';

export const handleGenerationError = async ({
  authenticatedUser,
  endTime,
  error,
  eventLogger,
  eventLogIndex,
  executionUuid,
  logger,
  spaceId,
  startTime,
  workflowId,
  workflowRunId,
  stepInput,
}: {
  authenticatedUser: AuthenticatedUser | undefined;
  endTime: Date;
  error: unknown;
  eventLogger: IEventLogger | undefined;
  eventLogIndex: string | undefined;
  executionUuid: string | undefined;
  logger: Logger;
  spaceId: string | undefined;
  startTime: Date;
  workflowId?: string;
  workflowRunId?: string;
  stepInput: {
    alerts?: unknown;
    api_config?: unknown;
  };
}): Promise<void> => {
  if (!executionUuid || !authenticatedUser || !spaceId || !eventLogger || !eventLogIndex) {
    return;
  }

  const apiConfig = stepInput.api_config as { connector_id?: string } | undefined;
  const connectorId = apiConfig?.connector_id;

  if (!connectorId) {
    return;
  }

  try {
    await writeAttackDiscoveryEvent({
      action: ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_FAILED,
      alertsContextCount: Array.isArray(stepInput.alerts) ? stepInput.alerts.length : undefined,
      authenticatedUser,
      connectorId,
      dataClient: null,
      duration: getDurationNanoseconds({ end: endTime, start: startTime }),
      end: endTime,
      eventLogger,
      eventLogIndex,
      executionUuid,
      message: `Attack discovery generation ${executionUuid} failed`,
      outcome: 'failure',
      reason: error instanceof Error ? error.message : 'Unknown error',
      spaceId,
      workflowId,
      workflowRunId,
    });
  } catch (loggingError) {
    logger.error(
      `Failed to log generation-failed event: ${
        loggingError instanceof Error ? loggingError.message : 'Unknown error'
      }`
    );
  }
};
