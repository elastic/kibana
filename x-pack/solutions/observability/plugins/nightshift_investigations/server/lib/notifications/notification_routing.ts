/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { types } from '@kbn/storage-adapter';
import { MAX_TEXT_LENGTH } from '@kbn/significant-events-schema';
import { defineInvestigationAttachment } from '@kbn/agentic-investigations-plugin/server';
import { investigationNotificationDestinationSchema } from '../../../common';

export const NOTIFICATION_ROUTING_ATTACHMENT_TYPE = 'nightshift.notification_routing';
export const notificationPhaseSchema = z.enum(['started', 'completed', 'failed']);
const identifier = z.string().min(1).max(500);
const messageId = z.string().min(1).max(100);
const timestamp = z.string().min(1).max(64);

export const notificationAttemptSchema = z.strictObject({
  execution_id: identifier,
  destination_id: identifier,
  phase: notificationPhaseSchema,
  attempt_id: z.string().min(1).max(100),
  status: z.enum(['sent', 'failed', 'unconfirmed']),
  attempted_at: timestamp,
  creates_root: z.boolean(),
  message_ts: messageId.optional(),
  sent_at: timestamp.optional(),
  error: z.string().max(MAX_TEXT_LENGTH).optional(),
});

export const notificationRoutingSchema = z.strictObject({
  id: identifier,
  spaceId: identifier,
  conversationId: identifier,
  investigationId: identifier,
  destinations: z.array(
    investigationNotificationDestinationSchema
      .omit({ automation_id: true, automation_name: true })
      .extend({
        id: identifier,
        automations: z.array(
          z.strictObject({
            id: z.string().max(500).optional(),
            name: z.string().max(500).optional(),
          })
        ),
        thread: z.strictObject({ channel: identifier, thread_ts: messageId }).optional(),
      })
  ),
  executions: z.array(
    z.strictObject({
      id: identifier,
      workflow_id: identifier,
      destination_ids: z.array(identifier),
      terminal_phase: z.enum(['completed', 'failed']).optional(),
    })
  ),
  attempts: z.array(notificationAttemptSchema),
});

export type NotificationPhase = z.infer<typeof notificationPhaseSchema>;
export type NotificationAttempt = z.infer<typeof notificationAttemptSchema>;
export type NotificationOutcome = Pick<
  NotificationAttempt,
  'status' | 'message_ts' | 'sent_at' | 'error'
> & {
  channel?: string;
};
export type NotificationRouting = z.infer<typeof notificationRoutingSchema>;
export type StoredNotificationRouting = Omit<NotificationRouting, 'id'>;
export type NotificationDestination = NotificationRouting['destinations'][number];

const notificationRoutingStorageSettings = {
  name: '.kibana-nightshift-notification-routing',
  schema: {
    properties: {
      spaceId: types.keyword({}),
      conversationId: types.keyword({}),
      investigationId: types.keyword({}),
      destinations: types.object({ enabled: false }),
      executions: types.object({ enabled: false }),
      attempts: types.object({ enabled: false }),
    },
  },
};

export const notificationRoutingAttachment = defineInvestigationAttachment<
  typeof NOTIFICATION_ROUTING_ATTACHMENT_TYPE,
  typeof notificationRoutingStorageSettings,
  StoredNotificationRouting
>({
  type: NOTIFICATION_ROUTING_ATTACHMENT_TYPE,
  storageSettings: notificationRoutingStorageSettings,
  schema: notificationRoutingSchema,
  hiddenInConversation: true,
  maxContentLength: 500,
  agentDescription:
    'The workflow manages notification delivery. Do not send lifecycle notifications yourself.',
  format: ({ destinations }) =>
    `The investigation workflow manages lifecycle notifications to ${destinations.length} destination(s).`,
});
