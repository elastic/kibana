/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import { NIGHTSHIFT_DEDUCTIVE_INVESTIGATION_AGENT_ID } from '../agents/deductive_investigation';
import { runMemoryOptimize } from '../memory/register_memory';
import { teeWorkflowLogger } from '../lib/tee_workflow_logger';
import type { NightshiftTelemetryClient } from '../telemetry';
import { withTimeout } from './with_timeout';

const MAX_ROUND_TEXT_LENGTH = 65_536;

/**
 * Bounds the post-round optimizer. It runs non-blocking, so a stall does not hold up an
 * investigation, but it should not leave a task hanging on a stuck inference call either.
 */
const OPTIMIZE_TIMEOUT_MS = 120_000;

export const memoryOptimizeStepDefinition = ({
  getAgentBuilder,
  getMemoryEsClient,
  logger,
  isEnabled,
  telemetry,
}: {
  getAgentBuilder: () => AgentBuilderPluginStart | undefined;
  getMemoryEsClient: () => ElasticsearchClient;
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
      prompt: z
        .string()
        .max(MAX_ROUND_TEXT_LENGTH)
        .describe('The user message that started the round.'),
      response: z
        .string()
        .max(MAX_ROUND_TEXT_LENGTH)
        .describe("The assistant's final response for the round."),
      agent_id: z.string().max(1024).optional().describe('Agent id that produced the round.'),
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
        .max(1024)
        .optional()
        .describe('Inference connector the triggering agent used for this round.'),
      conversation_id: z
        .string()
        .max(1024)
        .optional()
        .describe('Agent Builder conversation id for telemetry correlation.'),
      round_id: z
        .string()
        .max(1024)
        .optional()
        .describe('Completed Agent Builder round id for telemetry correlation.'),
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

      const workflowContext = context.contextManager.getContext();
      const { spaceId } = workflowContext.workflow;
      const workflowExecutionId = workflowContext.execution.id;
      const sandboxId = context.input.sandbox_id?.trim() ? context.input.sandbox_id : undefined;
      context.logger.info(
        `Running memory optimize for sandbox ${sandboxId ?? 'none'} (agent ${
          context.input.agent_id ?? 'unknown'
        })`
      );
      context.logger.debug(
        `Memory optimize step connector=${context.input.connector_id ?? '(none)'} ` +
          `promptChars=${context.input.prompt.length} responseChars=${context.input.response.length} ` +
          `recalledIds=${context.input.recalled_ids?.length ?? 0}`
      );

      let summary: Awaited<ReturnType<typeof runMemoryOptimize>>;
      try {
        summary = await withTimeout(
          (signal) =>
            runMemoryOptimize({
              request: context.contextManager.getFakeRequest(),
              agentId: context.input.agent_id,
              userMessage: context.input.prompt,
              assistantMessage: context.input.response,
              recalledIds: context.input.recalled_ids ?? [],
              esClient: getMemoryEsClient(),
              spaceId,
              signal,
              logger: teeWorkflowLogger(logger, context.logger),
              getAgentBuilder,
              connectorId: context.input.connector_id,
            }),
          OPTIMIZE_TIMEOUT_MS,
          `Memory optimize timed out after ${OPTIMIZE_TIMEOUT_MS}ms`
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

      if (!summary && context.input.agent_id === NIGHTSHIFT_DEDUCTIVE_INVESTIGATION_AGENT_ID) {
        telemetry.reportSemanticMemoryOptimized({
          agent_id: context.input.agent_id,
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
