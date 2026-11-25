/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JsonObject } from '@kbn/utility-types';
import { z } from '@kbn/zod/v4';
import { isSlackDeliveryFailureReason } from '@kbn/connector-specs';
import { InvalidNotificationDestinationError } from '../../client/errors';
import type { NotificationHandler } from './notification_delivery';
import { renderInvestigationSlackMessage } from './investigation_slack_composition';

const slackNotificationParamsSchema = z.strictObject({
  channel: z.string().min(1).max(500),
  thread_ts: z
    .string()
    .max(100)
    .optional()
    .describe('Parent message ID identifying the reply thread'),
});

/** The Slack destination's channel and thread, or undefined when its params are invalid. */
export const readSlackNotificationParams = (params: JsonObject) => {
  const parsed = slackNotificationParamsSchema.safeParse(params);
  return parsed.success ? parsed.data : undefined;
};

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
  prepareDelivery: ({
    notificationDestination,
    investigation,
    url,
    phase,
    reason,
    messageTs: editedMessageTs,
    runtime,
  }) => {
    const { channel, thread_ts: threadTs } = parseSlackNotificationParams(
      notificationDestination.params
    );
    const { text, blocks } = renderInvestigationSlackMessage({
      runtime,
      investigation,
      url,
      phase,
      reason,
      automationName: notificationDestination.automation_name,
    });
    const params: JsonObject = editedMessageTs
      ? {
          subAction: 'updateMessage',
          subActionParams: { channel, messageTs: editedMessageTs, text, blocks },
        }
      : {
          subAction: 'sendMessage',
          subActionParams: { channel, text, blocks, ...(threadTs ? { threadTs } : {}) },
        };
    return {
      params,
      getOutcome: (response) => {
        if (response.status !== 'ok') {
          const failureReason = response.errorMeta?.slackDeliveryReason;
          return {
            status: 'failed',
            error: response.serviceMessage || response.message || 'Slack delivery failed',
            ...(isSlackDeliveryFailureReason(failureReason) ? { reason_code: failureReason } : {}),
          };
        }
        const data = response.data;
        const messageTs = data && typeof data === 'object' && 'ts' in data ? data.ts : undefined;
        if (
          typeof messageTs !== 'string' ||
          messageTs.length > 100 ||
          !/^\d+\.\d+$/.test(messageTs)
        ) {
          return { status: 'unconfirmed', error: 'Slack returned no valid message ID' };
        }
        const resolvedChannel =
          data && typeof data === 'object' && 'channel' in data ? data.channel : undefined;
        const externalConversationId =
          data && typeof data === 'object' && 'externalConversationId' in data
            ? data.externalConversationId
            : undefined;
        return {
          status: 'sent',
          message_ts: messageTs,
          ...(typeof externalConversationId === 'string' &&
          externalConversationId.length > 0 &&
          externalConversationId.length <= 500
            ? { external_conversation_id: externalConversationId }
            : {}),
          sent_at: new Date().toISOString(),
          channel:
            typeof resolvedChannel === 'string' &&
            resolvedChannel.trim() &&
            resolvedChannel.length <= 500
              ? resolvedChannel
              : channel,
        };
      },
    };
  },
};
