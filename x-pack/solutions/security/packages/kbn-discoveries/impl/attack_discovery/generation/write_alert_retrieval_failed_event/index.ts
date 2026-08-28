/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, Logger } from '@kbn/core/server';
import type { IEventLogger } from '@kbn/event-log-plugin/server';
import type { ErrorCategory } from '@kbn/discoveries-schemas';
import {
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_ALERT_RETRIEVAL_FAILED,
  writeAttackDiscoveryEvent,
  type AttackDiscoverySource,
} from '../../persistence/event_logging';
import { getDurationNanoseconds } from '../../../lib/persistence';

import type { WorkflowExecutionsTracking } from '../types';

export const writeAlertRetrievalFailedEvent = async ({
  authenticatedUser,
  connectorId,
  endTime,
  errorCategory,
  errorMessage,
  eventLogger,
  eventLogIndex,
  executionUuid,
  failedWorkflowId,
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
  endTime: Date;
  errorCategory?: ErrorCategory;
  errorMessage: string;
  eventLogger: IEventLogger;
  eventLogIndex: string;
  executionUuid: string;
  failedWorkflowId?: string;
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
      action: ATTACK_DISCOVERY_EVENT_LOG_ACTION_ALERT_RETRIEVAL_FAILED,
      authenticatedUser,
      connectorId,
      dataClient: null,
      duration: getDurationNanoseconds({ end: endTime, start: startTime }),
      end: endTime,
      errorCategory,
      eventLogger,
      eventLogIndex,
      executionUuid,
      failedWorkflowId,
      message: `Attack discovery alert retrieval ${executionUuid} failed`,
      outcome: 'failure',
      reason: errorMessage,
      source,
      spaceId,
      workflowExecutions,
      workflowId,
      workflowRunId,
    });
  } catch (loggingError) {
    logger.error(
      `Failed to write alert-retrieval-failed event: ${
        loggingError instanceof Error ? loggingError.message : String(loggingError)
      }`
    );
  }
};
