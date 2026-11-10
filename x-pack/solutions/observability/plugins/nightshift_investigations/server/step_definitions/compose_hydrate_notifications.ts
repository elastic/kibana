/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { CoreStart } from '@kbn/core/server';
import { composeHydrateNotificationContext } from '../lib/hydrate_notification';
import {
  isValidOtelTraceId,
  toDeterministicTraceId,
  withNightshiftBackgroundSpan,
} from '../tracing';

export const composeHydrateNotificationsStepDefinition = ({
  getSavedObjects,
  getUiSettings,
}: {
  getSavedObjects?: () => CoreStart['savedObjects'] | undefined;
  getUiSettings?: () => CoreStart['uiSettings'] | undefined;
} = {}) =>
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
            materialize_execution_id: z.string().optional(),
            background_trace_id: z.string().optional(),
          }),
        }),
      }),
    }),
    handler: async (context) => {
      const { model_context: modelContext } = composeHydrateNotificationContext({
        writers: context.input.writers,
      });
      const workflowCtx = context.contextManager.getContext();
      const executionId = workflowCtx?.execution?.id;
      const spaceId = workflowCtx?.workflow?.spaceId ?? 'default';
      const isUuidExecutionId =
        typeof executionId === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(executionId);
      const candidateTraceId = isUuidExecutionId ? toDeterministicTraceId(executionId) : undefined;
      const hasValidOtelTraceId = isValidOtelTraceId(candidateTraceId);
      if (hasValidOtelTraceId && executionId) {
        await withNightshiftBackgroundSpan(
          {
            name: 'nightshift.composeHydrateNotifications',
            traceId: candidateTraceId,
            spaceId,
            workflowExecutionId: executionId,
            request: context.contextManager?.getFakeRequest?.(),
            getSavedObjects,
            getUiSettings,
            logger: context.logger,
            attributes: {
              'nightshift.recalled_ids': JSON.stringify(context.input.recalled_ids),
            },
          },
          async () => undefined
        );
      }
      return {
        output: {
          ...(modelContext ? { model_context: modelContext } : {}),
          workflow_context: {
            'nightshift.semantic_memory.recall': {
              version: 1 as const,
              data: {
                recalled_ids: context.input.recalled_ids,
                ...(hasValidOtelTraceId && executionId
                  ? {
                      materialize_execution_id: executionId,
                      background_trace_id: candidateTraceId,
                    }
                  : {}),
              },
            },
          },
        },
      };
    },
  });
