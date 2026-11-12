/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { types } from '@kbn/storage-adapter';
import { MAX_TEXT_LENGTH } from '@kbn/significant-events-schema';
import { defineInvestigationAttachment } from '@kbn/agentic-investigations-plugin/server';
import { investigationNotificationDestinationSchema } from '../../../common';

export const NOTIFICATION_ROUTING_ATTACHMENT_TYPE = 'nightshift.notification_routing';
export const notificationPhaseSchema = lazySchema(() =>
  z.enum(['started', 'completed', 'failed', 'timed_out'])
);
const identifier = z.string().min(1).max(500);
const messageId = z.string().min(1).max(100);
const timestamp = z.string().min(1).max(64);
const storedPhase = lazySchema(() => z.string().min(1).max(100));
const outcomeStatusSchema = lazySchema(() => z.enum(['sent', 'failed', 'unconfirmed']));

export const notificationAttemptSchema = lazySchema(() =>
  z
    .object({
      execution_id: identifier,
      destination_id: identifier,
      phase: storedPhase,
      attempt_id: z.string().min(1).max(100),
      status: z.string().min(1).max(100),
      attempted_at: timestamp,
      creates_root: z.boolean(),
      message_ts: messageId.optional(),
      external_conversation_id: identifier.optional(),
      sent_at: timestamp.optional(),
      error: z.string().max(MAX_TEXT_LENGTH).optional(),
    })
    .loose()
);

// Preserve additive fields at every level when an older instance updates a newer document.
const storedNotificationRoutingSchema = lazySchema(() =>
  z
    .object({
      spaceId: identifier,
      conversationId: identifier,
      investigationId: identifier,
      destinations: z.array(
        investigationNotificationDestinationSchema
          .omit({ automation_id: true, automation_name: true })
          .extend({
            id: identifier,
            automations: z.array(
              z
                .object({
                  id: z.string().max(500).optional(),
                  name: z.string().max(500).optional(),
                })
                .loose()
            ),
            thread: z.object({ channel: identifier, thread_ts: messageId }).loose().optional(),
          })
          .loose()
      ),
      executions: z.array(
        z
          .object({
            id: identifier,
            workflow_id: identifier,
            destination_ids: z.array(identifier),
            terminal_phase: storedPhase.optional(),
            lifecycle_claim_id: z.string().max(100).optional(),
          })
          .loose()
      ),
      attempts: z.array(notificationAttemptSchema),
    })
    .loose()
);

export const notificationRoutingSchema = lazySchema(() =>
  storedNotificationRoutingSchema.extend({ id: identifier })
);

export type NotificationPhase = z.infer<typeof notificationPhaseSchema>;
export type NotificationAttempt = z.infer<typeof notificationAttemptSchema>;
export type NotificationOutcome = Pick<
  NotificationAttempt,
  'message_ts' | 'external_conversation_id' | 'sent_at' | 'error'
> & {
  status: z.infer<typeof outcomeStatusSchema>;
  channel?: string;
};
export type NotificationRouting = z.infer<typeof notificationRoutingSchema>;
export type StoredNotificationRouting = z.infer<typeof storedNotificationRoutingSchema>;
export type NotificationDestination = NotificationRouting['destinations'][number];

/**
 * Whether the destination replies under a message the caller named, such as the Slack message that
 * triggered an automation, rather than under a thread it starts itself. That thread belongs to the
 * run started for the message, and the run keeps a single message in it.
 */
export const repliesUnderCallerMessage = ({ params }: Pick<NotificationDestination, 'params'>) =>
  typeof params.thread_ts === 'string' && params.thread_ts.length > 0;

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
