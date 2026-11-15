/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { CoreStart, Logger } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { MAX_KEYWORD_LENGTH } from '../../common';
import { usesKnowledge } from '../agents/agent_policy';
import type { InvestigationToolCall } from '../decision_trees/accessed_trees';
import { investigationRoundInputsSchema, withToolResults } from '../investigation_round';
import { runMemoryOptimize } from '../memory/register_memory';
import type { NightshiftTelemetryClient } from '../telemetry';
import { withTimeout } from './with_timeout';

/** Bounds the non-blocking post-round optimizer so a stuck inference call cannot hang a task. */
const OPTIMIZE_TIMEOUT_MS = 120_000;

export const memoryOptimizeStepDefinition = ({
  getAgentBuilder,
  getInference,
  getSavedObjects,
  getUiSettings,
  logger,
  isEnabled,
  telemetry,
}: {
  getAgentBuilder: () => AgentBuilderPluginStart | undefined;
  getInference: () => InferenceServerStart | undefined;
  getSavedObjects: () => CoreStart['savedObjects'] | undefined;
  getUiSettings: () => CoreStart['uiSettings'] | undefined;
  logger: Logger;
  isEnabled?: () => boolean;
  telemetry: NightshiftTelemetryClient;
}) =>
  createServerStepDefinition({
    id: 'nightshift.memoryOptimize',
    label: 'Optimize Nightshift Semantic Memory',
    category: StepCategory.Ai,
    description:
      'Labels recalled Semantic Memory pages from a completed investigation round and ' +
      'extracts durable customer-environment facts into the Semantic Memory index.',
    inputSchema: z.object({
      ...investigationRoundInputsSchema,
      agent_id: z
        .string()
        .max(1024)
        .optional()
        .describe('Supported agent policy selector; never used as a storage boundary.'),
      recalled_ids: z
        .array(z.string().max(2_000))
        .max(100)
        .optional()
        .describe('Semantic Memory ids persisted on the completed conversation round.'),
      sandbox_id: z
        .string()
        .max(1024)
        .optional()
        .describe(
          'Workspace key from nightshift.obtainSandbox. Already space-scoped. ' +
            'Omit when there is no conversation sandbox.'
        ),
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
    }),
    outputSchema: z.object({
      status: z.literal('ok').describe('The memory optimizer finished without throwing.'),
      skipped: z.boolean().optional(),
    }),
    handler: async (context) => {
      if (isEnabled && !isEnabled()) {
        context.logger.info('Skipped memory optimize (flag off)');
        return { output: { status: 'ok' as const, skipped: true } };
      }

      // Same policy as materialize: Memory is only for the Nightshift knowledge agents.
      if (!usesKnowledge(context.input.agent_id)) {
        context.logger.info('Skipped memory optimize for missing or unsupported agent');
        return { output: { status: 'ok' as const, skipped: true } };
      }

      const workflowContext = context.contextManager.getContext();
      // Storage tenancy comes from the trusted execution context; no input can select another Space.
      const { spaceId } = workflowContext.workflow;
      const workflowExecutionId = workflowContext.execution.id;
      const sandboxId = context.input.sandbox_id?.trim() ? context.input.sandbox_id : undefined;
      context.logger.info(
        `Running memory optimize for sandbox ${sandboxId ?? 'none'} (agent ${
          context.input.agent_id ?? 'unknown'
        })`
      );
      context.logger.debug(
        `Memory optimize step promptChars=${context.input.prompt.length} responseChars=${context.input.response.length} ` +
          `recalledIds=${context.input.recalled_ids?.length ?? 0}`
      );

      let summary: Awaited<ReturnType<typeof runMemoryOptimize>>;
      try {
        summary = await withTimeout(
          async (signal) =>
            runMemoryOptimize({
              request: context.contextManager.getFakeRequest(),
              agentId: context.input.agent_id,
              userMessage: context.input.prompt,
              assistantMessage: context.input.response,
              toolCalls: withToolResults(
                (context.input.tool_calls ?? []) as InvestigationToolCall[],
                context.input.tool_results ?? []
              ),
              conversationId: context.input.conversation_id,
              roundId: context.input.round_id,
              roundIndex: context.input.round_index,
              recalledIds: context.input.recalled_ids ?? [],
              esClient: context.contextManager.getScopedEsClient(),
              spaceId,
              signal,
              logger,
              getAgentBuilder,
              getInference,
              getSavedObjects,
              getUiSettings,
              requestedConnectorId: context.input.connector_id,
              roundConnectorId: context.input.round_connector_id,
              interactionId: workflowExecutionId,
            }),
          OPTIMIZE_TIMEOUT_MS,
          `Memory optimize timed out after ${OPTIMIZE_TIMEOUT_MS}ms`,
          context.abortSignal
        );
      } catch (error) {
        telemetry.reportSemanticMemoryOptimized({
          agent_id: context.input.agent_id ?? 'unknown',
          ...(context.input.conversation_id
            ? { conversation_id: context.input.conversation_id }
            : {}),
          ...(context.input.round_id ? { round_id: context.input.round_id } : {}),
          workflow_execution_id: workflowExecutionId,
          outcome: 'failure',
        });
        throw error;
      }

      if (summary && summary.writeFailureCount > 0) {
        telemetry.reportSemanticMemoryOptimized({
          agent_id: context.input.agent_id ?? 'unknown',
          ...(context.input.conversation_id
            ? { conversation_id: context.input.conversation_id }
            : {}),
          ...(context.input.round_id ? { round_id: context.input.round_id } : {}),
          workflow_execution_id: workflowExecutionId,
          outcome: 'failure',
          write_failure_count: summary.writeFailureCount,
        });
        throw new Error(
          `Memory optimize failed to persist ${summary.writeFailureCount} required operation(s)`
        );
      }

      if (!summary) {
        telemetry.reportSemanticMemoryOptimized({
          agent_id: context.input.agent_id ?? 'unknown',
          ...(context.input.conversation_id
            ? { conversation_id: context.input.conversation_id }
            : {}),
          ...(context.input.round_id ? { round_id: context.input.round_id } : {}),
          workflow_execution_id: workflowExecutionId,
          outcome: 'failure',
        });
      } else if (summary) {
        telemetry.reportSemanticMemoryOptimized({
          agent_id: context.input.agent_id ?? 'unknown',
          ...(context.input.conversation_id
            ? { conversation_id: context.input.conversation_id }
            : {}),
          ...(context.input.round_id ? { round_id: context.input.round_id } : {}),
          workflow_execution_id: workflowExecutionId,
          outcome: 'success',
          recalled_count: summary.recalledCount,
          loaded_count: summary.loadedCount,
          useful_count: summary.usefulCount,
          harmful_count: summary.harmfulCount,
          extraction_proposed_count: summary.extractionProposedCount,
          standalone_upsert_count: summary.standaloneUpsertCount,
          safety_skip_count: summary.safetySkipCount,
          merge_attempt_count: summary.mergeAttemptCount,
          merge_success_count: summary.mergeSuccessCount,
          harmful_archive_count: summary.harmfulArchiveCount,
          merged_source_archive_count: summary.mergedSourceArchiveCount,
          write_failure_count: summary.writeFailureCount,
        });
      }

      return { output: { status: 'ok' as const } };
    },
  });
