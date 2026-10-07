/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { MAX_TEXT_LENGTH } from '@kbn/significant-events-schema';
import type { Logger } from '@kbn/core/server';
import type {
  GetInvestigationResponse,
  InvestigationNotificationDestination,
} from '../../../common';
import { prepareNotificationDelivery } from './notification_delivery';
import type { ExecuteConnector } from './notification_delivery';
import type { NotificationRoutingClient } from './notification_routing_client';
import type {
  NotificationPhase,
  NotificationOutcome,
  NotificationRouting,
} from './notification_routing';

export interface DeliverInvestigationNotificationsResult {
  sent: number;
  failed: number;
  unconfirmed: number;
}

const countAttempts = (
  routing: NotificationRouting | undefined,
  executionId: string,
  phase: NotificationPhase
): DeliverInvestigationNotificationsResult => {
  const counts = { sent: 0, failed: 0, unconfirmed: 0 };
  for (const attempt of routing?.attempts ?? []) {
    if (attempt.execution_id === executionId && attempt.phase === phase) {
      counts[attempt.status]++;
    }
  }
  return counts;
};

/** Claims before posting and saves each receipt immediately; replay never resends an uncertain delivery. */
export const deliverInvestigationNotifications = async ({
  investigation,
  executionId,
  workflowId,
  phase,
  reason,
  notificationDestinations,
  investigationUrl,
  getExecute,
  routingClient,
  signal,
  logger,
}: {
  investigation: GetInvestigationResponse;
  executionId: string;
  workflowId: string;
  phase: NotificationPhase;
  reason?: string;
  notificationDestinations: InvestigationNotificationDestination[];
  investigationUrl: string;
  getExecute: () => Promise<ExecuteConnector>;
  routingClient: NotificationRoutingClient;
  signal: AbortSignal;
  logger: Pick<Logger, 'warn'>;
}): Promise<DeliverInvestigationNotificationsResult> => {
  let routing = await routingClient.get();
  if (signal.aborted || !(await routingClient.isActive())) {
    return countAttempts(routing, executionId, phase);
  }
  if (phase === 'started') {
    if (!routing && notificationDestinations.length === 0) {
      return countAttempts(routing, executionId, phase);
    }
    routing = await routingClient.initialize(executionId, workflowId, notificationDestinations);
  } else {
    if (!routing && notificationDestinations.length === 0) {
      return countAttempts(routing, executionId, phase);
    }
    routing = await routingClient.selectTerminalPhase(executionId, phase);
  }
  const execution = routing.executions.find(({ id }) => id === executionId);
  if (!execution || execution.workflow_id !== workflowId) {
    throw new Error('Notification execution was not initialized for this workflow');
  }
  const hasEligibleDestinations = execution.destination_ids.some(
    (id) =>
      !routing?.attempts.some(
        (attempt) =>
          attempt.execution_id === executionId &&
          attempt.destination_id === id &&
          attempt.phase === phase
      )
  );
  if (!hasEligibleDestinations || signal.aborted) {
    return countAttempts(routing, executionId, phase);
  }

  let execute: ExecuteConnector | undefined;
  let setupError: string | undefined;
  try {
    execute = await getExecute();
  } catch (error) {
    setupError = error instanceof Error ? error.message : 'Actions setup failed';
  }
  for (const destinationId of execution.destination_ids) {
    if (signal.aborted || !(await routingClient.isActive())) {
      break;
    }
    routing = await routingClient.get();
    if (!routing) {
      throw new Error('Notification routing disappeared');
    }
    if (
      routing.attempts.some(
        (attempt) =>
          attempt.execution_id === executionId &&
          attempt.destination_id === destinationId &&
          attempt.phase === phase
      )
    ) {
      continue;
    }
    const destination = routing.destinations.find(({ id }) => id === destinationId);
    if (!destination) {
      throw new Error('Notification destination disappeared');
    }
    const explicitParent = destination.params.thread_ts;
    const threadTs =
      destination.thread?.thread_ts ||
      (typeof explicitParent === 'string' && explicitParent) ||
      undefined;
    const createsRoot = phase === 'started' && !threadTs;
    const uncertainRoot =
      !threadTs &&
      routing.attempts.some(
        (attempt) =>
          attempt.destination_id === destinationId &&
          attempt.creates_root &&
          attempt.status === 'unconfirmed'
      );
    let diagnostic = setupError;
    if (uncertainRoot) {
      diagnostic = 'A previous root delivery is unconfirmed; automatic thread creation is blocked';
    } else if (phase !== 'started' && !threadTs) {
      diagnostic = 'No confirmed notification thread is available';
    }
    let delivery;
    try {
      delivery = prepareNotificationDelivery({
        investigation,
        url: investigationUrl,
        phase,
        reason,
        notificationDestination: {
          type: destination.type,
          connector_id: destination.connector_id,
          params: {
            ...destination.params,
            ...(destination.thread ? { channel: destination.thread.channel } : {}),
            ...(threadTs ? { thread_ts: threadTs } : {}),
          },
          automation_name: destination.automations
            .map(({ name, id }) => name || id)
            .filter(Boolean)
            .join(', '),
        },
      });
    } catch (error) {
      diagnostic = error instanceof Error ? error.message : 'Notification preparation failed';
    }
    if (signal.aborted) {
      break;
    }
    const attemptId = randomUUID();
    const identity = `investigation "${investigation.investigation_id}", execution "${executionId}", destination "${destinationId}", phase "${phase}", attempt "${attemptId}"`;
    let attempt;
    try {
      attempt = await routingClient.claim(
        executionId,
        destinationId,
        phase,
        attemptId,
        createsRoot && !uncertainRoot
      );
    } catch (error) {
      logger.warn(
        `Could not persist notification claim for ${identity}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
    if (!attempt) {
      continue;
    }
    let outcome: NotificationOutcome;
    if (signal.aborted || !(await routingClient.isActive())) {
      outcome = { status: 'unconfirmed', error: 'Notification delivery stopped after claiming' };
    } else if (diagnostic || !execute || !delivery) {
      outcome = { status: 'failed', error: diagnostic || 'Notification delivery is unavailable' };
    } else {
      try {
        const response = await execute({
          actionId: destination.connector_id,
          signal,
          params: delivery.params,
        });
        outcome = signal.aborted
          ? { status: 'unconfirmed', error: 'Cancelled during notification delivery' }
          : delivery.getOutcome(response);
      } catch (error) {
        outcome = {
          status: 'unconfirmed',
          error: error instanceof Error ? error.message : 'Notification delivery failed',
        };
      }
    }
    if (outcome.error !== undefined) {
      outcome.error = outcome.error.slice(0, MAX_TEXT_LENGTH);
    }
    if (outcome.status !== 'sent') {
      logger.warn(`Notification delivery for ${identity} is ${outcome.status}: ${outcome.error}`);
    }
    try {
      await routingClient.record(attemptId, outcome);
    } catch (error) {
      logger.warn(
        `Could not persist notification delivery for ${identity}; do not resend: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  }
  return countAttempts(await routingClient.get(), executionId, phase);
};
