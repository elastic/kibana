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
import type { SandboxPluginStart } from '@kbn/sandbox-plugin/server';
import { NIGHTSHIFT_INVESTIGATION_AGENT_ID } from '../agents/investigation';
import { hydrateMemoryWorkspace } from '../memory/register_memory';
import { previewText } from '../memory/log_format';
import { teeWorkflowLogger } from '../lib/tee_workflow_logger';
import type { NightshiftTelemetryClient } from '../telemetry';
import { unscopeConversationId } from '../tools/sandbox_bash/tool_utils';
import { withTimeout } from './with_timeout';

/** Caps a stuck write so it cannot stall the rest of the parallel hydrate. */
const MATERIALIZE_TIMEOUT_MS = 45_000;

export const memoryMaterializeToSandboxStepDefinition = ({
  getSandboxStart,
  getMemoryEsClient,
  logger,
  isEnabled,
  telemetry,
}: {
  getSandboxStart: () => SandboxPluginStart | undefined;
  getMemoryEsClient: () => Promise<ElasticsearchClient>;
  logger: Logger;
  isEnabled?: () => boolean;
  telemetry: NightshiftTelemetryClient;
}) =>
  createServerStepDefinition({
    id: 'nightshift.memoryMaterializeToSandbox',
    label: 'Materialize Nightshift Semantic Memory to Sandbox',
    category: StepCategory.Ai,
    description:
      'Writes ranked Semantic Memory pages into /workspace/memories for the sandbox obtained ' +
      'earlier in this workflow. Does not allocate; uses sandbox_id as-is.',
    inputSchema: z.object({
      sandbox_id: z
        .string()
        .min(1)
        .max(1024)
        .describe('Workspace key from nightshift.obtainSandbox. Already space-scoped.'),
      prompt: z
        .string()
        .max(65_536)
        .optional()
        .describe('The user message for this round, used as a memory search query when present.'),
      agent_id: z
        .string()
        .max(1024)
        .optional()
        .describe('Agent whose memory store to materialize. Missing agent_id skips memory.'),
      conversation_id: z
        .string()
        .max(1024)
        .optional()
        .describe('Agent Builder conversation id for telemetry correlation.'),
    }),
    outputSchema: z.object({
      sandbox_id: z.string().describe('Sandbox that received the memory pages.'),
      skipped: z.boolean().optional(),
      recalled_ids: z
        .array(z.string())
        .describe('Memory page ids recalled for this exact conversation round.'),
      notification: z
        .string()
        .describe('Markdown fragment listing memory pages new this turn, or empty.'),
    }),
    handler: async (context) => {
      const {
        sandbox_id: sandboxId,
        prompt,
        agent_id: agentId,
        conversation_id: conversationId,
      } = context.input;
      const workflowContext = context.contextManager.getContext();
      const { spaceId } = workflowContext.workflow;
      const workflowExecutionId = workflowContext.execution.id;

      if (isEnabled && !isEnabled()) {
        context.logger.info(`Skipped memory materialize for sandbox ${sandboxId} (flag off)`);
        return {
          output: { sandbox_id: sandboxId, skipped: true, recalled_ids: [], notification: '' },
        };
      }

      const trimmedAgentId = agentId?.trim();
      if (!trimmedAgentId) {
        context.logger.info(
          `Skipped memory materialize for sandbox ${sandboxId} (missing agent_id)`
        );
        return {
          output: { sandbox_id: sandboxId, skipped: true, recalled_ids: [], notification: '' },
        };
      }
      if (trimmedAgentId !== NIGHTSHIFT_INVESTIGATION_AGENT_ID) {
        context.logger.info('Skipped memory materialize for unsupported agent');
        context.logger.debug(`Memory materialize unsupported agent=${trimmedAgentId}`);
        return {
          output: { sandbox_id: sandboxId, skipped: true, recalled_ids: [], notification: '' },
        };
      }

      const sandboxStart = getSandboxStart();

      if (!sandboxStart) {
        throw new Error(
          'The sandbox is not configured — ' +
            'ensure the sandbox plugin is installed and configured.'
        );
      }

      const session = sandboxStart.getSessionForSpace(
        spaceId,
        unscopeConversationId(spaceId, sandboxId)
      );

      context.logger.info(
        `Materializing semantic memory into sandbox ${sandboxId} (agent ${trimmedAgentId})`
      );
      context.logger.debug(
        `Memory materialize step promptChars=${prompt?.length ?? 0} prompt=${JSON.stringify(
          previewText(prompt)
        )}`
      );

      let result: Awaited<ReturnType<typeof hydrateMemoryWorkspace>>;
      try {
        result = await withTimeout(
          async (signal) =>
            hydrateMemoryWorkspace({
              session,
              esClient: await getMemoryEsClient(),
              spaceId,
              agentId: trimmedAgentId,
              query: prompt,
              signal,
              logger: teeWorkflowLogger(logger, context.logger),
            }),
          MATERIALIZE_TIMEOUT_MS,
          `Memory materialize to sandbox timed out after ${MATERIALIZE_TIMEOUT_MS}ms`
        );
      } catch (error) {
        telemetry.reportSemanticMemoryMaterialized({
          agent_id: trimmedAgentId,
          ...(conversationId ? { conversation_id: conversationId } : {}),
          workflow_execution_id: workflowExecutionId,
          outcome: 'failure',
        });
        throw error;
      }

      telemetry.reportSemanticMemoryMaterialized({
        agent_id: trimmedAgentId,
        ...(conversationId ? { conversation_id: conversationId } : {}),
        workflow_execution_id: workflowExecutionId,
        outcome: 'success',
        retrieval_mode: result.summary.retrievalMode,
        search_fallback: result.summary.searchFallback,
        candidate_count: result.summary.candidateCount,
        recalled_count: result.summary.recalledCount,
        new_page_count: result.summary.newPageCount,
        catalog_size: result.summary.catalogSize,
        catalog_evicted_count: result.summary.catalogEvictedCount,
        pod_reset: result.summary.podReset,
        notification_chars: result.summary.notificationChars,
      });

      return {
        output: {
          sandbox_id: sandboxId,
          recalled_ids: result.recalledIds,
          notification: result.notification,
        },
      };
    },
  });
