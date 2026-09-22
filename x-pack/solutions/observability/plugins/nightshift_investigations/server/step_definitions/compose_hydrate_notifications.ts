/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { composeHydrateNotificationContext } from '../lib/hydrate_notification';

export const composeHydrateNotificationsStepDefinition = () =>
  createServerStepDefinition({
    id: 'nightshift.composeHydrateNotifications',
    label: 'Compose Nightshift Hydrate Notifications',
    category: StepCategory.Ai,
    description:
      'Builds model-only <system_update> context when any hydrate node reported new files. ' +
      'Does not wrap individual fragments. Omits model_context when every fragment is empty.',
    inputSchema: z.object({
      notifications: z
        .array(z.string())
        .describe('Hydrate-node markdown fragments, in workflow order. Empty strings are dropped.'),
    }),
    outputSchema: z.object({
      model_context: z
        .string()
        .optional()
        .describe('Model-only <system_update> block. Absent when nothing was new.'),
    }),
    handler: async (context) => {
      const { model_context: modelContext } = composeHydrateNotificationContext({
        notifications: context.input.notifications,
      });
      if (!modelContext) {
        return { output: {} };
      }
      return { output: { model_context: modelContext } };
    },
  });
