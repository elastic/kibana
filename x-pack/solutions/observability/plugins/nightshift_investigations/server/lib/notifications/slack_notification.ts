/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JsonObject } from '@kbn/utility-types';
import { z } from '@kbn/zod/v4';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import { InvalidNotificationDestinationError } from '../../client/errors';
import type { NotificationDelivery, NotificationHandler } from './notification_delivery';
import type { NotificationOutcome } from './notification_routing';
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

const readField = (data: unknown, key: string): unknown =>
  data && typeof data === 'object' && key in data
    ? (data as Record<string, unknown>)[key]
    : undefined;

const isBoundedString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= 500;

/**
 * The workspace (team) the message landed in: the Elastic Slack app reports it as `team`, and
 * Slack's own `chat.postMessage` response carries it on the posted message.
 */
const readWorkspace = (data: unknown): string | undefined => {
  const workspace = readField(data, 'team') ?? readField(readField(data, 'message'), 'team');
  return isBoundedString(workspace) ? workspace : undefined;
};

const toOutcome = (
  response: ActionTypeExecutorResult<unknown>,
  channel: string
): NotificationOutcome => {
  if (response.status !== 'ok') {
    return {
      status: 'failed',
      error: response.serviceMessage || response.message || 'Slack delivery failed',
    };
  }
  const data = response.data;
  const messageTs = readField(data, 'ts');
  if (typeof messageTs !== 'string' || messageTs.length > 100 || !/^\d+\.\d+$/.test(messageTs)) {
    return { status: 'unconfirmed', error: 'Slack returned no valid message ID' };
  }
  const resolvedChannel = readField(data, 'channel');
  const workspace = readWorkspace(data);
  return {
    status: 'sent',
    message_ts: messageTs,
    sent_at: new Date().toISOString(),
    channel: isBoundedString(resolvedChannel) ? resolvedChannel : channel,
    ...(workspace ? { workspace } : {}),
  };
};

export const slackNotificationHandler: NotificationHandler = {
  validateParams: (params) => {
    parseSlackNotificationParams(params);
  },
  prepareDelivery: ({
    notificationDestination,
    investigation,
    url,
    phase,
    reason,
    editMessageTs,
  }) => {
    const { channel, thread_ts: threadTs } = parseSlackNotificationParams(
      notificationDestination.params
    );
    const text = formatInvestigationSlackMessage({
      investigation,
      url,
      phase,
      reason,
      automationName: notificationDestination.automation_name,
    });
    const post: NotificationDelivery = {
      params: {
        subAction: 'sendMessage',
        subActionParams: { channel, text, ...(threadTs ? { threadTs } : {}) },
      },
      getOutcome: (response) => toOutcome(response, channel),
    };
    if (!editMessageTs) {
      return post;
    }
    return {
      params: {
        subAction: 'updateMessage',
        subActionParams: { channel, messageTs: editMessageTs, text },
      },
      getOutcome: (response) => toOutcome(response, channel),
      fallback: post,
    };
  },
};
