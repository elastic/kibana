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
      recalled_ids: z
        .array(z.string())
        .max(100)
        .describe('Semantic Memory ids recalled for this exact round.'),
    }),
    outputSchema: z.object({
      model_context: z
        .string()
        .optional()
        .describe('Model-only <system_update> block. Absent when nothing was new.'),
      workflow_context: z.object({
        'nightshift.semantic_memory.recall': z.object({
          version: z.literal(1),
          data: z.object({
            recalled_ids: z.array(z.string()).max(100),
          }),
        }),
      }),
    }),
    handler: async (context) => {
      const { model_context: modelContext } = composeHydrateNotificationContext({
        notifications: context.input.notifications,
      });
      return {
        output: {
          ...(modelContext ? { model_context: modelContext } : {}),
          workflow_context: {
            'nightshift.semantic_memory.recall': {
              version: 1 as const,
              data: {
                recalled_ids: context.input.recalled_ids,
              },
            },
          },
        },
      };
    },
  });
