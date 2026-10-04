/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { MAX_TEXT_LENGTH } from '@kbn/significant-events-schema';
import type { Logger } from '@kbn/core/server';
import type { NightshiftInvestigationsClient } from '../../client/investigations_client';
import type { GetInvestigationResponse, InvestigationNotificationOutcome } from '../../../common';
import { isTerminalStatus } from '../../../common';
import { prepareNotificationDelivery } from './notification_delivery';
import type { ExecuteConnector, NotifiableInvestigation } from './notification_delivery';

export interface DeliverInvestigationNotificationsResult {
  sent: number;
  failed: number;
  unconfirmed: number;
}

const FALLBACK_DELIVERY_ERROR = 'Notification delivery failed';

/** Claims and records each destination separately so replay never resends an uncertain attempt. */
export const deliverInvestigationNotifications = async ({
  investigation,
  investigationUrl,
  getExecute,
  client,
  signal,
  logger,
}: {
  investigation: NotifiableInvestigation &
    Pick<
      GetInvestigationResponse,
      'investigation_id' | 'notificationDestinations' | 'notifications'
    >;
  investigationUrl: string;
  getExecute: () => Promise<ExecuteConnector>;
  client: Pick<
    NightshiftInvestigationsClient,
    'claimNotificationDestination' | 'recordNotificationOutcome'
  >;
  signal: AbortSignal;
  logger: Pick<Logger, 'warn'>;
}): Promise<DeliverInvestigationNotificationsResult> => {
  const result = { sent: 0, failed: 0, unconfirmed: 0 };
  if (!isTerminalStatus(investigation.status)) {
    return result;
  }

  const notifications = investigation.notifications ?? [];
  result.unconfirmed = notifications.filter(({ status }) => status === 'unconfirmed').length;
  const attemptedDestinationIndices = new Set(
    notifications.map(({ destination_index }) => destination_index)
  );
  const eligibleDestinations = (investigation.notificationDestinations ?? [])
    .map((destination, index) => [index, destination] as const)
    .filter(([index]) => !attemptedDestinationIndices.has(index));
  if (!eligibleDestinations.length || signal.aborted) {
    return result;
  }

  // Initialize Actions once before persisting any claims, including when setup fails.
  let execute: ExecuteConnector | undefined;
  let setupError: string | undefined;
  try {
    execute = await getExecute();
  } catch (error) {
    setupError =
      error instanceof Error ? error.message : 'Could not initialize notification delivery';
  }

  for (const [destinationIndex, notificationDestination] of eligibleDestinations) {
    if (signal.aborted) {
      break;
    }

    const delivery = prepareNotificationDelivery({
      notificationDestination,
      investigation,
      url: investigationUrl,
    });
    const attemptId = randomUUID();
    const notification = await client.claimNotificationDestination(
      investigation.investigation_id,
      destinationIndex,
      attemptId
    );
    if (!notification) {
      continue;
    }

    let outcome: InvestigationNotificationOutcome;
    if (signal.aborted) {
      outcome = { status: 'unconfirmed', error: 'Cancelled before notification delivery' };
    } else if (!execute) {
      outcome = { status: 'failed', error: setupError || FALLBACK_DELIVERY_ERROR };
    } else {
      try {
        const response = await execute({
          actionId: notificationDestination.connector_id,
          signal,
          params: delivery.params,
        });
        outcome = signal.aborted
          ? { status: 'unconfirmed', error: 'Cancelled during notification delivery' }
          : delivery.getOutcome(response);
      } catch (error) {
        outcome = {
          status: 'unconfirmed',
          error: error instanceof Error ? error.message : FALLBACK_DELIVERY_ERROR,
        };
      }
    }
    if (outcome.error !== undefined) {
      outcome.error = outcome.error.slice(0, MAX_TEXT_LENGTH);
    }
    if (outcome.status !== 'sent') {
      logger.warn(
        `Notification delivery for investigation "${investigation.investigation_id}" to destination ${destinationIndex} (connector "${notificationDestination.connector_id}") (attempt "${attemptId}") is ${outcome.status}: ${outcome.error}`
      );
    }
    try {
      await client.recordNotificationOutcome(
        investigation.investigation_id,
        destinationIndex,
        attemptId,
        outcome
      );
    } catch (error) {
      logger.warn(
        `Could not persist notification delivery for investigation "${
          investigation.investigation_id
        }" to destination ${destinationIndex} (connector "${
          notificationDestination.connector_id
        }") (attempt "${attemptId}"); do not resend: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
    if (outcome.status === 'sent') {
      result.sent++;
    } else if (outcome.status === 'failed') {
      result.failed++;
    } else {
      result.unconfirmed++;
    }
    if (signal.aborted) {
      break;
    }
  }
  return result;
};
