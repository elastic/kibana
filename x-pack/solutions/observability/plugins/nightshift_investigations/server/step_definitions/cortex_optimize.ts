/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { Logger } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import { runCortexOptimize } from '../cortex/register_cortex';
import { teeWorkflowLogger } from '../lib/tee_workflow_logger';
import { withTimeout } from './with_timeout';

const MAX_ROUND_TEXT_LENGTH = 65_536;

/**
 * Bounds the post-round optimizer. It runs non-blocking, so a stall does not hold up an
 * investigation, but it should not leave a task hanging on a stuck inference call either.
 */
const OPTIMIZE_TIMEOUT_MS = 120_000;

export const cortexOptimizeStepDefinition = ({
  getAgentBuilder,
  logger,
  isEnabled,
}: {
  getAgentBuilder: () => AgentBuilderPluginStart | undefined;
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
      prompt: z
        .string()
        .max(MAX_ROUND_TEXT_LENGTH)
        .describe('The user message that started the round.'),
      response: z
        .string()
        .max(MAX_ROUND_TEXT_LENGTH)
        .describe("The assistant's final response for the round."),
      agent_id: z.string().max(1024).optional().describe('Agent id that produced the round.'),
      sandbox_id: z
        .string()
        .max(1024)
        .optional()
        .describe('Workspace key from nightshift.obtainSandbox. Already space-scoped.'),
      connector_id: z
        .string()
        .max(1024)
        .optional()
        .describe('Inference connector the triggering agent used for this round.'),
    }),
    outputSchema: z.object({
      status: z.literal('ok').describe('The optimizer finished without throwing.'),
      skipped: z.boolean().optional(),
    }),
    handler: async (context) => {
      if (isEnabled && !isEnabled()) {
        context.logger.info('Skipped Cortex optimize (flag off)');
        return { output: { status: 'ok' as const, skipped: true } };
      }

      context.logger.info(
        `Running Cortex optimize for agent ${context.input.agent_id ?? 'unknown'}`
      );

      await withTimeout(
        (signal) =>
          runCortexOptimize({
            request: context.contextManager.getFakeRequest(),
            agentId: context.input.agent_id,
            userMessage: context.input.prompt,
            assistantMessage: context.input.response,
            esClient: context.contextManager.getScopedEsClient(),
            spaceId: context.contextManager.getContext().workflow.spaceId,
            signal,
            logger: teeWorkflowLogger(logger, context.logger),
            getAgentBuilder,
            connectorId: context.input.connector_id,
          }),
        OPTIMIZE_TIMEOUT_MS,
        `Cortex optimize timed out after ${OPTIMIZE_TIMEOUT_MS}ms`
      );

      return { output: { status: 'ok' as const } };
    },
  });
