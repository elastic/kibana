/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { MAX_TEXT_LENGTH } from '@kbn/significant-events-schema';
import { MAX_KEYWORD_LENGTH } from '../../common';
import { notificationPhaseSchema } from '../lib/notifications/notification_routing';
import { sendInvestigationNotifications } from '../lib/notifications/send_investigation_notifications';
import type { InvestigationNotificationDeps } from '../lib/notifications/send_investigation_notifications';

const inputSchema = z.object({
  investigation_id: z
    .string()
    .min(1)
    .max(MAX_KEYWORD_LENGTH)
    .describe('The investigation receiving lifecycle notifications'),
  phase: notificationPhaseSchema,
  reason: z.string().max(MAX_TEXT_LENGTH).optional(),
});

export const sendNotificationsStepDefinition = (deps: InvestigationNotificationDeps) =>
  createServerStepDefinition({
    id: 'nightshift.sendNotifications',
    label: 'Send Nightshift Notifications',
    category: StepCategory.Ai,
    description:
      'Sends investigation lifecycle messages and records their delivery in the notification routing attachment.',
    inputSchema,
    outputSchema: z.object({
      sent: z.number().describe('Destinations that received the message in this run'),
      failed: z.number().describe('Destinations whose delivery failed in this run'),
      unconfirmed: z.number().describe('Attempts without a confirmed delivery result'),
    }),
    handler: async (context) => {
      const { investigation_id: investigationId, phase, reason } = inputSchema.parse(context.input);
      const output = await sendInvestigationNotifications(deps, context, {
        investigationId,
        phase,
        reason,
      });
      return { output };
    },
  });
