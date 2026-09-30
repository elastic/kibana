/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { AnalyticsServiceSetup, Logger } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import type { InvestigationToolCall } from '../decision_trees/accessed_trees';
import { runCortexOptimize } from '../cortex/register_cortex';
import { toolCallsSchema, toolResultsSchema } from './tool_calls_schema';
import { withTimeout } from './with_timeout';

const MAX_ROUND_TEXT_LENGTH = 65_536;

/**
 * Bounds the post-round optimizer. It runs non-blocking, so a stall does not hold up an
 * investigation, but it should not leave a task hanging on a stuck inference call either.
 */
const OPTIMIZE_TIMEOUT_MS = 120_000;

/** Attaches each call's results, matched on `tool_call_id`, so the optimizer sees what it returned. */
export const withToolResults = (
  toolCalls: InvestigationToolCall[],
  toolResults: Array<{ tool_call_id: string; results: unknown[] }>
): InvestigationToolCall[] => {
  if (toolResults.length === 0) {
    return toolCalls;
  }
  const resultsById = new Map(
    toolResults.map(({ tool_call_id: toolCallId, results }) => [toolCallId, results])
  );
  return toolCalls.map((call) => {
    const results = call.tool_call_id ? resultsById.get(call.tool_call_id) : undefined;
    return results ? { ...call, results } : call;
  });
};

export const cortexOptimizeStepDefinition = ({
  getInference,
  getSearchInferenceEndpoints,
  analytics,
  logger,
}: {
  getInference: () => InferenceServerStart | undefined;
  getSearchInferenceEndpoints: () => SearchInferenceEndpointsPluginStart | undefined;
  analytics: AnalyticsServiceSetup;
  logger: Logger;
}) =>
  createServerStepDefinition({
    id: 'nightshift.cortexOptimize',
    label: 'Optimize Nightshift Cortex',
    category: StepCategory.Ai,
    description:
      'Proposes Cortex wiki edits from a completed investigation round and writes them ' +
      'to the Context Engine AI index.',
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
        .describe('Conversation the round belongs to. Recorded on the edit telemetry events.'),
      round_id: z
        .string()
        .max(1024)
        .optional()
        .describe('Id of the completed round. Recorded on the edit telemetry events.'),
      tool_calls: toolCallsSchema.describe(
        'Investigator tool calls from this round. Shows the optimizer what the investigator queried.'
      ),
      tool_results: toolResultsSchema.describe(
        'Results of the investigator tool calls, keyed by tool_call_id. Shows the optimizer what each query returned.'
      ),
    }),
    outputSchema: z.object({
      status: z.literal('ok').describe('The optimizer finished without throwing.'),
    }),
    handler: async (context) => {
      const { workflow, execution } = context.contextManager.getContext();
      await withTimeout(
        (signal) =>
          runCortexOptimize({
            request: context.contextManager.getFakeRequest(),
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
            logger,
            getInference,
            getSearchInferenceEndpoints,
          }),
        OPTIMIZE_TIMEOUT_MS,
        `Cortex optimize timed out after ${OPTIMIZE_TIMEOUT_MS}ms`
      );

      return { output: { status: 'ok' as const } };
    },
  });
