/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import type { GetInvestigationResponse, InvestigationNotification } from '../../../common';
import { NIGHTSHIFT_INVESTIGATION_ID_QUERY_PARAM } from '../../../common/locators/investigation_locator';
import { formatInvestigationSlackMessage } from './format_investigation_slack_message';
import type { NotifiableInvestigation } from './format_investigation_slack_message';

/** The `slack2.sendMessage` sub-action, in the shape `actionsClient.execute` takes. */
export interface SlackSendMessageExecution {
  actionId: string;
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
  notifications: InvestigationNotification[];
  sent: number;
  failed: number;
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

/**
 * Posts a settled investigation to every destination that has not been delivered yet and returns
 * the destinations with their results filled in. Never throws for a Slack failure: the failure is
 * the result, recorded on the investigation so the automation's history can show it. Entries
 * already `sent` are left alone, which is what makes a re-run post nothing twice.
 */
export const deliverInvestigationNotifications = async ({
  investigation,
  kibanaUrl,
  spaceId,
  execute,
  logger,
}: {
  investigation: NotifiableInvestigation &
    Pick<GetInvestigationResponse, 'investigation_id' | 'notifications'>;
  kibanaUrl: string;
  spaceId: string;
  execute: ExecuteConnector;
  /** Only `warn` is used, so the narrower workflow step logger fits too. */
  logger: Pick<Logger, 'warn'>;
}): Promise<DeliverInvestigationNotificationsResult> => {
  const notifications = investigation.notifications ?? [];
  if (!TERMINAL_STATUSES.includes(investigation.status)) {
    return { notifications, sent: 0, failed: 0 };
  }

  const url = buildInvestigationUrl(kibanaUrl, spaceId, investigation.investigation_id);
  let sent = 0;
  let failed = 0;
  const delivered: InvestigationNotification[] = [];

  for (const notification of notifications) {
    if (notification.status === 'sent') {
      delivered.push(notification);
      continue;
    }

    const text = formatInvestigationSlackMessage({
      investigation,
      url,
      automationName: notification.automation_name,
    });

    let outcome: Pick<InvestigationNotification, 'status' | 'message_ts' | 'error'>;
    try {
      const result = await execute({
        actionId: notification.connector_id,
        params: {
          subAction: 'sendMessage',
          subActionParams: {
            channel: notification.channel,
            text,
            ...(notification.thread_ts ? { threadTs: notification.thread_ts } : {}),
          },
        },
      });
      outcome =
        result.status === 'ok'
          ? { status: 'sent', message_ts: messageTsOf(result) }
          : { status: 'failed', error: toErrorMessage(result) };
    } catch (error) {
      outcome = { status: 'failed', error: error?.message || FALLBACK_DELIVERY_ERROR };
    }

    if (outcome.status === 'sent') {
      sent += 1;
    } else {
      failed += 1;
      logger.warn(
        `Slack delivery for investigation "${investigation.investigation_id}" to ${notification.channel} via connector "${notification.connector_id}" failed: ${outcome.error}`
      );
    }

    delivered.push({
      ...notification,
      ...outcome,
      ...(outcome.status === 'sent' ? { sent_at: new Date().toISOString() } : {}),
    });
  }

  return { notifications: delivered, sent, failed };
};
