/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { AnalyticsServiceSetup, CoreStart, Logger } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { MAX_KEYWORD_LENGTH } from '../../common';
import type { InvestigationToolCall } from '../decision_trees/accessed_trees';
import { runCortexOptimize } from '../cortex/register_cortex';
import {
  appliedWriteSchema,
  investigationRoundInputsSchema,
  withToolResults,
} from '../investigation_round';
import { withNightshiftBackgroundSpan } from '../tracing';
import { withTimeout } from './with_timeout';

/**
 * Bounds the post-round optimizer. It runs non-blocking, so a stall does not hold up an
 * investigation, but it should not leave a task hanging on a stuck inference call either.
 */
const OPTIMIZE_TIMEOUT_MS = 120_000;

export { withToolResults };

export const cortexOptimizeStepDefinition = ({
  getAgentBuilder,
  getInference,
  getSavedObjects,
  getUiSettings,
  analytics,
  logger,
  isEnabled,
}: {
  getAgentBuilder: () => AgentBuilderPluginStart | undefined;
  getInference: () => InferenceServerStart | undefined;
  getSavedObjects: () => CoreStart['savedObjects'] | undefined;
  getUiSettings: () => CoreStart['uiSettings'] | undefined;
  analytics: AnalyticsServiceSetup;
  logger: Logger;
  isEnabled?: () => boolean;
}) =>
  createServerStepDefinition({
    id: 'nightshift.cortexOptimize',
    label: 'Optimize Nightshift Cortex',
    category: StepCategory.Ai,
    description:
      'Proposes Cortex wiki edits from a completed investigation round and writes them ' +
      'to the Context Engine AI index. sandbox_id identifies the workspace this round used; ' +
      'the optimizer currently reads the transcript, not the sandbox files.',
    inputSchema: z.object({
      ...investigationRoundInputsSchema,
      agent_id: z.string().max(1024).optional().describe('Agent id that produced the round.'),
      sandbox_id: z
        .string()
        .max(1024)
        .optional()
        .describe('Workspace key from nightshift.obtainSandbox. Already space-scoped.'),
      connector_id: z
        .string()
        .max(MAX_KEYWORD_LENGTH)
        .optional()
        .describe('Strict model override for a direct run. Fails when the id does not resolve.'),
      round_connector_id: z
        .string()
        .max(MAX_KEYWORD_LENGTH)
        .optional()
        .describe('Inference connector the triggering agent used for this round.'),
      background_trace_id: z
        .string()
        .max(128)
        .optional()
        .describe('Deterministic T_background trace id from materialize.'),
    }),
    outputSchema: z.object({
      status: z.literal('ok').describe('The optimizer finished without throwing.'),
      skipped: z.boolean().optional(),
      opened_ids: z
        .array(z.string())
        .optional()
        .describe('Canonical Cortex page ids opened by the investigator this round.'),
      applied_writes: z
        .array(appliedWriteSchema)
        .optional()
        .describe('Cortex page writes applied during this round.'),
    }),
    handler: async (context) => {
      if (isEnabled && !isEnabled()) {
        context.logger.info('Skipped Cortex optimize (flag off)');
        return { output: { status: 'ok' as const, skipped: true } };
      }

      context.logger.info(
        `Running Cortex optimize for agent ${context.input.agent_id ?? 'unknown'}`
      );
      const { workflow, execution } = context.contextManager.getContext();
      const request = context.contextManager.getFakeRequest();
      const result = await withNightshiftBackgroundSpan(
        {
          name: 'nightshift.cortexOptimize',
          traceId: context.input.background_trace_id || execution.id,
          roundId: context.input.round_id,
          conversationId: context.input.conversation_id,
          spaceId: workflow.spaceId,
          workflowExecutionId: execution.id,
          request,
          getSavedObjects,
          getUiSettings,
          logger,
        },
        async (span) => {
          const res = await withTimeout(
            (signal) =>
              runCortexOptimize({
                request,
                agentId: context.input.agent_id,
                userMessage: context.input.prompt,
                assistantMessage: context.input.response,
                toolCalls: withToolResults(
                  (context.input.tool_calls ?? []) as InvestigationToolCall[],
                  context.input.tool_results ?? []
                ),
                esClient: context.contextManager.getScopedEsClient(),
                spaceId: workflow.spaceId,
                interactionId: execution.id,
                signal,
                analytics,
                conversationId: context.input.conversation_id,
                roundId: context.input.round_id,
                roundIndex: context.input.round_index,
                requestedConnectorId: context.input.connector_id,
                roundConnectorId: context.input.round_connector_id,
                logger,
                getAgentBuilder,
                getInference,
                getSavedObjects,
                getUiSettings,
              }),
            OPTIMIZE_TIMEOUT_MS,
            `Cortex optimize timed out after ${OPTIMIZE_TIMEOUT_MS}ms`
          );
          if (res?.openedIds) {
            span?.setAttribute('nightshift.opened_ids', JSON.stringify(res.openedIds));
          }
          if (res?.appliedWrites) {
            span?.setAttribute('nightshift.applied_writes', JSON.stringify(res.appliedWrites));
          }
          return res;
        }
      );

      return {
        output: {
          status: 'ok' as const,
          ...(result?.openedIds && result.openedIds.length > 0
            ? { opened_ids: result.openedIds }
            : {}),
          ...(result?.appliedWrites && result.appliedWrites.length > 0
            ? { applied_writes: result.appliedWrites }
            : {}),
        },
      };
    },
  });
