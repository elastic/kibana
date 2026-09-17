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
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import { runMemoryOptimize } from '../memory/register_memory';
import type { SandboxConnectionManager } from '../tools/sandbox_bash/grpc_client';
import { scopeConversationId } from '../tools/sandbox_bash/tool_utils';
import { withTimeout } from './with_timeout';

const MAX_ROUND_TEXT_LENGTH = 65_536;

/**
 * Bounds the post-round optimizer. It runs non-blocking, so a stall does not hold up an
 * investigation, but it should not leave a task hanging on a stuck inference call either.
 */
const OPTIMIZE_TIMEOUT_MS = 120_000;

export const memoryOptimizeStepDefinition = ({
  getInference,
  getSearchInferenceEndpoints,
  getConnectionManager,
  logger,
}: {
  getInference: () => InferenceServerStart | undefined;
  getSearchInferenceEndpoints: () => SearchInferenceEndpointsPluginStart | undefined;
  getConnectionManager: () => SandboxConnectionManager | undefined;
  logger: Logger;
}) =>
  createServerStepDefinition({
    id: 'nightshift.memoryOptimize',
    label: 'Optimize Nightshift Semantic Memory',
    category: StepCategory.Ai,
    description:
      'Labels recalled Semantic Memory pages from a completed investigation round and ' +
      'extracts durable customer-environment facts into the AI index.',
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
      conversation_id: z
        .string()
        .max(1024)
        .optional()
        .describe('Conversation id whose sandbox holds the recalled memory files.'),
    }),
    outputSchema: z.object({
      status: z.literal('ok').describe('The memory optimizer finished without throwing.'),
    }),
    handler: async (context) => {
      const manager = getConnectionManager();
      const spaceId = context.contextManager.getContext().workflow.spaceId;
      const conversationId = context.input.conversation_id
        ? scopeConversationId(spaceId, context.input.conversation_id)
        : undefined;

      await withTimeout(
        (signal) =>
          runMemoryOptimize({
            request: context.contextManager.getFakeRequest(),
            agentId: context.input.agent_id,
            userMessage: context.input.prompt,
            assistantMessage: context.input.response,
            conversationId,
            apiClient: manager?.apiClient,
            esClient: context.contextManager.getScopedEsClient(),
            spaceId,
            signal,
            logger,
            getInference,
            getSearchInferenceEndpoints,
          }),
        OPTIMIZE_TIMEOUT_MS,
        `Memory optimize timed out after ${OPTIMIZE_TIMEOUT_MS}ms`
      );

      return { output: { status: 'ok' as const } };
    },
  });
