/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JsonObject } from '@kbn/utility-types';
import { z } from '@kbn/zod/v4';
import { InvalidNotificationDestinationError } from '../../client/errors';
import type { NotificationHandler } from './notification_delivery';
import { formatInvestigationSlackMessage } from './format_investigation_slack_message';

const slackNotificationParamsSchema = z.strictObject({
  channel: z.string().min(1).max(500),
  thread_ts: z
    .string()
    .max(100)
    .optional()
    .describe('Parent message ID identifying the reply thread'),
});

const parseSlackNotificationParams = (params: JsonObject) => {
  const parsed = slackNotificationParamsSchema.safeParse(params);
  if (!parsed.success) {
    throw new InvalidNotificationDestinationError(parsed.error.message);
  }
  return parsed.data;
};

export const slackNotificationHandler: NotificationHandler = {
  validateParams: (params) => {
    parseSlackNotificationParams(params);
  },
  prepareDelivery: ({ notificationDestination, investigation, url }) => {
    const { channel, thread_ts: threadTs } = parseSlackNotificationParams(
      notificationDestination.params
    );
    return {
      params: {
        subAction: 'sendMessage',
        subActionParams: {
          channel,
          text: formatInvestigationSlackMessage({
            investigation,
            url,
            automationName: notificationDestination.automation_name,
          }),
          ...(threadTs ? { threadTs } : {}),
        },
      },
      getOutcome: (response) => {
        if (response.status !== 'ok') {
          return {
            status: 'failed',
            error: response.serviceMessage || response.message || 'Slack delivery failed',
          };
        }
        const data = response.data;
        const messageTs = data && typeof data === 'object' && 'ts' in data ? data.ts : undefined;
        if (typeof messageTs !== 'string' || !messageTs.trim() || messageTs.length > 100) {
          return { status: 'unconfirmed', error: 'Slack returned no valid message ID' };
        }
        return { status: 'sent', message_ts: messageTs, sent_at: new Date().toISOString() };
      },
    };
  },
};
