/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { MAX_TEXT_LENGTH } from '@kbn/significant-events-schema';
import type { Logger } from '@kbn/core/server';
import type { InvestigationNotificationDestination } from '../../../common';
import { prepareNotificationDelivery } from './notification_delivery';
import type {
  ExecuteConnector,
  NotifiableInvestigation,
  NotificationDelivery,
} from './notification_delivery';
import type { NotificationRoutingClient } from './notification_routing_client';
import type {
  NotificationPhase,
  NotificationOutcome,
  NotificationRouting,
  NotificationDestination,
} from './notification_routing';
import { repliesUnderCallerMessage } from './notification_routing';

export interface DeliverInvestigationNotificationsResult {
  sent: number;
  failed: number;
  unconfirmed: number;
}

interface DeliverInvestigationNotificationsParams {
  investigation: NotifiableInvestigation;
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
  onTerminalPhaseSelected?: () => Promise<void>;
}

interface PreparedDestinationDelivery {
  delivery?: NotificationDelivery;
  diagnostic?: string;
  createsRoot: boolean;
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

const hasDeliveryAttempt = (
  routing: NotificationRouting,
  executionId: string,
  destinationId: string,
  phase: NotificationPhase
): boolean =>
  routing.attempts.some(
    (attempt) =>
      attempt.execution_id === executionId &&
      attempt.destination_id === destinationId &&
      attempt.phase === phase
  );

/**
 * The message this execution's phase posted or edited under the caller's message. Undefined for
 * other destinations and when that delivery was not confirmed.
 */
export const getSentMessageTs = (
  routing: NotificationRouting,
  executionId: string,
  destination: NotificationDestination,
  phase: NotificationPhase
): string | undefined => {
  if (!repliesUnderCallerMessage(destination)) {
    return undefined;
  }
  return routing.attempts.find(
    (attempt) =>
      attempt.execution_id === executionId &&
      attempt.destination_id === destination.id &&
      attempt.phase === phase &&
      attempt.status === 'sent'
  )?.message_ts;
};

/** The thread's single message: the one this execution's started phase posted. */
export const getStartedMessageTs = (
  routing: NotificationRouting,
  executionId: string,
  destination: NotificationDestination
): string | undefined => getSentMessageTs(routing, executionId, destination, 'started');

const prepareDestinationDelivery = (
  {
    investigation,
    investigationUrl,
    executionId,
    phase,
    reason,
  }: DeliverInvestigationNotificationsParams,
  routing: NotificationRouting,
  destination: NotificationDestination,
  setupError?: string
): PreparedDestinationDelivery => {
  const explicitParent = destination.params.thread_ts;
  const threadTs =
    destination.thread?.thread_ts ||
    (typeof explicitParent === 'string' && explicitParent) ||
    undefined;
  const createsRoot = (phase === 'started' || phase === 'failed') && !threadTs;
  const uncertainRoot =
    !threadTs &&
    routing.attempts.some(
      (attempt) =>
        attempt.destination_id === destination.id &&
        attempt.creates_root &&
        attempt.status === 'unconfirmed'
    );
  let diagnostic = setupError;
  if (uncertainRoot) {
    diagnostic = 'A previous root delivery is unconfirmed; automatic thread creation is blocked';
  } else if (!createsRoot && !threadTs) {
    diagnostic = 'No confirmed notification thread is available';
  }

  // The terminal phase edits the started message, so the thread keeps a single message.
  const messageTs =
    phase === 'started' ? undefined : getStartedMessageTs(routing, executionId, destination);
  let delivery: NotificationDelivery | undefined;
  try {
    delivery = prepareNotificationDelivery({
      investigation,
      url: investigationUrl,
      phase,
      reason,
      ...(messageTs ? { messageTs } : {}),
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
  return { delivery, diagnostic, createsRoot: createsRoot && !uncertainRoot };
};

const executeDestinationDelivery = async (
  { routingClient, signal }: DeliverInvestigationNotificationsParams,
  destination: NotificationDestination,
  { delivery, diagnostic }: PreparedDestinationDelivery,
  execute?: ExecuteConnector
): Promise<NotificationOutcome> => {
  if (signal.aborted || !(await routingClient.isActive())) {
    return { status: 'unconfirmed', error: 'Notification delivery stopped after claiming' };
  }
  if (diagnostic || !execute || !delivery) {
    return { status: 'failed', error: diagnostic || 'Notification delivery is unavailable' };
  }
  try {
    let response = await execute({
      actionId: destination.connector_id,
      signal,
      params: delivery.params,
    });
    const subActionParams = delivery.params.subActionParams;
    if (
      !signal.aborted &&
      response.status !== 'ok' &&
      subActionParams &&
      typeof subActionParams === 'object' &&
      'blocks' in subActionParams &&
      /invalid_blocks|msg_blocks_too_long|failed to post outbound message/i.test(
        response.serviceMessage || response.message || ''
      )
    ) {
      const { blocks, ...textOnlyParams } = subActionParams;
      response = await execute({
        actionId: destination.connector_id,
        signal,
        params: { ...delivery.params, subActionParams: textOnlyParams },
      });
    }
    return signal.aborted
      ? { status: 'unconfirmed', error: 'Cancelled during notification delivery' }
      : delivery.getOutcome(response);
  } catch (error) {
    return {
      status: 'unconfirmed',
      error: error instanceof Error ? error.message : 'Notification delivery failed',
    };
  }
};

const recordDeliveryOutcome = async (
  { routingClient, logger }: DeliverInvestigationNotificationsParams,
  attemptId: string,
  identity: string,
  outcome: NotificationOutcome
): Promise<void> => {
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
};

const deliverToDestination = async (
  params: DeliverInvestigationNotificationsParams,
  destinationId: string,
  execute?: ExecuteConnector,
  setupError?: string
): Promise<void> => {
  const { investigation, executionId, phase, routingClient, signal, logger } = params;
  const routing = await routingClient.get();
  if (!routing) {
    throw new Error('Notification routing disappeared');
  }
  if (hasDeliveryAttempt(routing, executionId, destinationId, phase)) {
    return;
  }
  const destination = routing.destinations.find(({ id }) => id === destinationId);
  if (!destination) {
    throw new Error('Notification destination disappeared');
  }
  const delivery = prepareDestinationDelivery(params, routing, destination, setupError);
  if (signal.aborted) {
    return;
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
      delivery.createsRoot
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
    return;
  }

  const outcome = await executeDestinationDelivery(params, destination, delivery, execute);
  await recordDeliveryOutcome(params, attemptId, identity, outcome);
};

/**
 * Delivers one lifecycle phase for an investigation workflow execution and returns its persisted
 * sent, failed, and unconfirmed counts, including attempts encountered on replay.
 *
 * Started and failed phases initialize the execution's participants without changing an existing
 * snapshot; terminal phases select one outcome before posting or emitting lifecycle events.
 *
 * Resolves Actions once, then reads current routing for each destination, skips existing attempts,
 * and prepares a root or thread reply. Each post requires a durable unconfirmed claim before the
 * connector is invoked once; its outcome and any confirmed thread reference are saved immediately.
 * Uncertain root deliveries block automatic root recreation, including in later executions.
 *
 * Cancellation and inactive attachments stop further delivery. Setup, preparation, and connector
 * error responses are recorded per destination so other destinations can proceed. Posting
 * exceptions, missing confirmation, or cancellation after claiming remain unconfirmed.
 * Persistence errors propagate and stop further posts, leaving any durable claim in place
 * without retrying the connector.
 */
export const deliverInvestigationNotifications = async (
  params: DeliverInvestigationNotificationsParams
): Promise<DeliverInvestigationNotificationsResult> => {
  const {
    executionId,
    workflowId,
    phase,
    notificationDestinations,
    getExecute,
    routingClient,
    signal,
  } = params;
  const existingRouting = await routingClient.get();
  if (signal.aborted || !(await routingClient.isActive())) {
    return countAttempts(existingRouting, executionId, phase);
  }
  if (!existingRouting && notificationDestinations.length === 0 && phase !== 'failed') {
    return countAttempts(existingRouting, executionId, phase);
  }
  if (phase === 'failed') {
    await routingClient.initialize(executionId, workflowId, notificationDestinations);
  }
  const routing =
    phase === 'started'
      ? await routingClient.initialize(executionId, workflowId, notificationDestinations)
      : await routingClient.selectTerminalPhase(executionId, phase);
  const execution = routing.executions.find(({ id }) => id === executionId);
  if (!execution || execution.workflow_id !== workflowId) {
    throw new Error('Notification execution was not initialized for this workflow');
  }
  if (phase !== 'started' && execution.terminal_phase !== phase) {
    return countAttempts(routing, executionId, phase);
  }
  if (phase !== 'started' && !signal.aborted) {
    await params.onTerminalPhaseSelected?.();
  }
  const hasEligibleDestinations = execution.destination_ids.some(
    (id) => !hasDeliveryAttempt(routing, executionId, id, phase)
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
    await deliverToDestination(params, destinationId, execute, setupError);
  }
  return countAttempts(await routingClient.get(), executionId, phase);
};
