/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  INVESTIGATION_ROUND_KINDS,
  isInvestigationRoundKind,
  ROUND_WORKFLOW_CONTEXT_KEY,
} from '../client/round_kind';
import { composeHydrateNotificationContext } from '../lib/hydrate_notification';

export const composeHydrateNotificationsStepDefinition = () =>
  createServerStepDefinition({
    id: 'nightshift.composeHydrateNotifications',
    label: 'Compose Nightshift Hydrate Notifications',
    category: StepCategory.Ai,
    description:
      'Builds model-only <system_update> context from the workspace writers. Reports new files, ' +
      'and reports a directory as possibly incomplete when its writer failed or never reported. ' +
      'Does not wrap individual fragments. Omits model_context when there is nothing to report.',
    inputSchema: z.object({
      writers: z
        .array(
          z.object({
            directory: z
              .string()
              .max(1024)
              .describe('Absolute sandbox directory this writer materializes into.'),
            notification: z
              .string()
              .optional()
              .describe("The writer's own markdown fragment. Empty when it wrote nothing."),
            completed: z
              .boolean()
              .optional()
              .describe(
                'False when the writer produced no output at all (branch killed by branch-timeout).'
              ),
          })
        )
        .max(16)
        .describe('Every workspace writer of this round, in workflow order.'),
      recalled_ids: z
        .array(z.string())
        .max(100)
        .describe('Semantic Memory ids recalled for this exact round.'),
      round_kind: z
        .string()
        .max(64)
        .optional()
        .describe('The kind of investigation round, when it is known. Empty when it is not.'),
    }),
    outputSchema: z.object({
      model_context: z
        .string()
        .optional()
        .describe('Model-only <system_update> block. Absent when there is nothing to report.'),
      workflow_context: z.object({
        'nightshift.semantic_memory.recall': z.object({
          version: z.literal(1),
          data: z.object({
            recalled_ids: z.array(z.string()).max(100),
          }),
        }),
        [ROUND_WORKFLOW_CONTEXT_KEY]: z
          .object({
            version: z.literal(1),
            data: z.object({ round_kind: z.enum(INVESTIGATION_ROUND_KINDS) }),
          })
          .optional(),
      }),
    }),
    handler: async (context) => {
      const { model_context: modelContext } = composeHydrateNotificationContext({
        writers: context.input.writers,
      });
      // Liquid renders an absent step output as ''.
      const roundKind = context.input.round_kind;
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
            ...(isInvestigationRoundKind(roundKind)
              ? {
                  [ROUND_WORKFLOW_CONTEXT_KEY]: {
                    version: 1 as const,
                    data: { round_kind: roundKind },
                  },
                }
              : {}),
          },
        },
      };
    },
  });
