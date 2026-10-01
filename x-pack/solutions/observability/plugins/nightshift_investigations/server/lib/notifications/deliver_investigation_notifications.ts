/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { MAX_TEXT_LENGTH } from '@kbn/significant-events-schema';
import type { Logger } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import type { NightshiftInvestigationsClient } from '../../client/investigations_client';
import type { GetInvestigationResponse, InvestigationNotificationOutcome } from '../../../common';
import { NIGHTSHIFT_INVESTIGATION_ID_QUERY_PARAM } from '../../../common/locators/investigation_locator';
import { formatInvestigationSlackMessage } from './format_investigation_slack_message';
import type { NotifiableInvestigation } from './format_investigation_slack_message';

/** The `slack2.sendMessage` sub-action, in the shape `actionsClient.execute` takes. */
export interface SlackSendMessageExecution {
  actionId: string;
  signal?: AbortSignal;
  params: {
    subAction: 'sendMessage';
    subActionParams: { channel: string; text: string; threadTs?: string };
  };
}

/**
 * The one seam between delivery and the actions plugin, so the workflow step (request-scoped
 * client) and any background caller (unsecured client) share the formatting and bookkeeping.
 */
export type ExecuteConnector = (
  execution: SlackSendMessageExecution
) => Promise<ActionTypeExecutorResult<unknown>>;

export interface DeliverInvestigationNotificationsResult {
  sent: number;
  failed: number;
  unconfirmed: number;
}

const TERMINAL_STATUSES: ReadonlyArray<GetInvestigationResponse['status']> = [
  'completed',
  'failed',
  'cancelled',
];

const FALLBACK_DELIVERY_ERROR = 'Slack delivery failed';

/** Same space-prefix convention the workflow engine uses for its own links. */
export const buildInvestigationUrl = (
  kibanaUrl: string,
  spaceId: string,
  investigationId: string
): string => {
  const spacePrefix = spaceId === DEFAULT_SPACE_ID ? '' : `/s/${encodeURIComponent(spaceId)}`;
  const query = `${NIGHTSHIFT_INVESTIGATION_ID_QUERY_PARAM}=${encodeURIComponent(investigationId)}`;
  return `${kibanaUrl.replace(/\/$/, '')}${spacePrefix}/app/nightshift?${query}`;
};

const toErrorMessage = (result: ActionTypeExecutorResult<unknown>): string =>
  result.serviceMessage || result.message || FALLBACK_DELIVERY_ERROR;

const messageTsOf = (result: ActionTypeExecutorResult<unknown>): string | undefined => {
  const ts = (result.data as { ts?: unknown } | undefined)?.ts;
  return typeof ts === 'string' ? ts : undefined;
};

/** Claims and records each destination separately so replay never resends an uncertain attempt. */
export const deliverInvestigationNotifications = async ({
  investigation,
  kibanaUrl,
  spaceId,
  execute,
  setupError,
  client,
  signal,
  logger,
}: {
  investigation: NotifiableInvestigation &
    Pick<GetInvestigationResponse, 'investigation_id' | 'notifications'>;
  kibanaUrl: string;
  spaceId: string;
  execute?: ExecuteConnector;
  setupError?: string;
  client: Pick<
    NightshiftInvestigationsClient,
    'claimNotification' | 'recordNotificationOutcome' | 'get'
  >;
  signal: AbortSignal;
  logger: Pick<Logger, 'warn'>;
}): Promise<DeliverInvestigationNotificationsResult> => {
  const notifications = investigation.notifications ?? [];
  const result = { sent: 0, failed: 0, unconfirmed: 0 };
  if (!TERMINAL_STATUSES.includes(investigation.status)) return result;

  const url = buildInvestigationUrl(kibanaUrl, spaceId, investigation.investigation_id);
  for (const [index, notification] of notifications.entries()) {
    if (notification.status !== undefined) continue;
    if (signal.aborted) break;

    const attemptId = randomUUID();
    const claimed = await client.claimNotification(
      investigation.investigation_id,
      index,
      attemptId
    );
    if (!claimed) continue;

    let outcome: InvestigationNotificationOutcome;
    if (signal.aborted) {
      outcome = { status: 'unconfirmed', error: 'Cancelled before Slack delivery' };
    } else if (!execute) {
      outcome = { status: 'failed', error: setupError || FALLBACK_DELIVERY_ERROR };
    } else {
      try {
        const response = await execute({
          actionId: claimed.connector_id,
          signal,
          params: {
            subAction: 'sendMessage',
            subActionParams: {
              channel: claimed.channel,
              text: formatInvestigationSlackMessage({
                investigation,
                url,
                automationName: claimed.automation_name,
              }),
              ...(claimed.thread_ts ? { threadTs: claimed.thread_ts } : {}),
            },
          },
        });
        const messageTs = messageTsOf(response);
        if (signal.aborted) {
          outcome = { status: 'unconfirmed', error: 'Cancelled during Slack delivery' };
        } else if (response.status !== 'ok') {
          outcome = { status: 'failed', error: toErrorMessage(response) };
        } else if (!messageTs?.trim() || messageTs.length > 100) {
          outcome = { status: 'unconfirmed', error: 'Slack returned no valid message timestamp' };
        } else {
          outcome = { status: 'sent', message_ts: messageTs, sent_at: new Date().toISOString() };
        }
      } catch (error) {
        outcome = {
          status: 'unconfirmed',
          error: error instanceof Error ? error.message : FALLBACK_DELIVERY_ERROR,
        };
      }
    }
    if (outcome.error !== undefined) outcome.error = outcome.error.slice(0, MAX_TEXT_LENGTH);
    if (outcome.status !== 'sent') {
      logger.warn(
        `Slack delivery for investigation "${investigation.investigation_id}" to ${claimed.channel} (attempt "${attemptId}") is ${outcome.status}: ${outcome.error}`
      );
    }
    try {
      await client.recordNotificationOutcome(
        investigation.investigation_id,
        index,
        attemptId,
        outcome
      );
    } catch (error) {
      logger.warn(
        `Could not persist Slack delivery for investigation "${
          investigation.investigation_id
        }" to ${claimed.channel} (attempt "${attemptId}"); do not resend: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
    if (outcome.status === 'sent') result.sent++;
    else if (outcome.status === 'failed') result.failed++;
    if (signal.aborted) break;
  }
  const latest = await client.get(investigation.investigation_id);
  result.unconfirmed = (latest.notifications ?? []).filter(
    ({ status }) => status === 'unconfirmed'
  ).length;
  return result;
};
