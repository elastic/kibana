/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, Logger } from '@kbn/core/server';
import type { IEventLogger } from '@kbn/event-log-plugin/server';
import {
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_ALERT_RETRIEVAL_STARTED,
  writeAttackDiscoveryEvent,
  type AttackDiscoverySource,
} from '../../persistence/event_logging';

import type { WorkflowExecutionsTracking } from '../types';

export const writeAlertRetrievalStartedEvent = async ({
  authenticatedUser,
  connectorId,
  eventLogger,
  eventLogIndex,
  executionUuid,
  logger,
  source,
  spaceId,
  startTime,
  workflowExecutions,
  workflowId,
  workflowRunId,
}: {
  authenticatedUser: AuthenticatedUser;
  connectorId: string;
  eventLogger: IEventLogger;
  eventLogIndex: string;
  executionUuid: string;
  logger: Logger;
  source?: AttackDiscoverySource;
  spaceId: string;
  startTime: Date;
  workflowExecutions: WorkflowExecutionsTracking;
  workflowId: string;
  workflowRunId: string;
}): Promise<void> => {
  try {
    await writeAttackDiscoveryEvent({
      action: ATTACK_DISCOVERY_EVENT_LOG_ACTION_ALERT_RETRIEVAL_STARTED,
      authenticatedUser,
      connectorId,
      dataClient: null,
      eventLogger,
      eventLogIndex,
      executionUuid,
      message: `Attack discovery alert retrieval ${executionUuid} started`,
      source,
      spaceId,
      start: startTime,
      workflowExecutions,
      workflowId,
      workflowRunId,
    });
  } catch (error) {
    logger.error(
      `Failed to write alert-retrieval-started event: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};
