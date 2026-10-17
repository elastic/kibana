/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { ConversationRoundStep, ToolCallStep, ToolResult } from '@kbn/agent-builder-common';
import type { InvestigationToolCall } from '../decision_trees/accessed_trees';
import { toolCallsSchema, toolResultsSchema } from '../step_definitions/tool_calls_schema';

const MAX_ROUND_TEXT_LENGTH = 65_536;

/**
 * Shared Zod input schema for post-execution optimizer steps that inspect a completed
 * Nightshift investigation round (`cortexOptimize`, `memoryOptimize`, `decisionTreePrepare`,
 * `decisionTreeReinforce`).
 */
export const investigationRoundInputsSchema = {
  prompt: z
    .string()
    .max(MAX_ROUND_TEXT_LENGTH)
    .describe('The user message that started the round.'),
  response: z
    .string()
    .max(MAX_ROUND_TEXT_LENGTH)
    .describe("The assistant's final response for the round."),
  conversation_id: z.string().max(1024).optional().describe('Conversation the round belongs to.'),
  round_id: z.string().max(1024).optional().describe('Id of the completed round.'),
  tool_calls: toolCallsSchema.describe(
    'Investigator tool calls from this round. Shows the optimizer what the investigator queried.'
  ),
  tool_results: toolResultsSchema.describe(
    'Results of the investigator tool calls, keyed by tool_call_id. Shows the optimizer what each query returned.'
  ),
};

export type InvestigationTranscriptStep =
  | { kind: 'reasoning'; text: string }
  | {
      kind: 'tool';
      toolId: string;
      toolCallId?: string;
      params: Record<string, unknown>;
      /** Raw result array from the round or hook payload, when present. */
      results?: unknown[];
      /** Excerpt source: the tool's output text, or its error message. */
      resultText?: string;
      isError: boolean;
    };

export interface LoadedInvestigationRound {
  source: 'persisted_round' | 'hook_tool_calls' | 'tool_call_params_only';
  roundId?: string;
  traceId?: string;
  startedAt?: string;
  /** Interleaved reasoning and tool-call steps normalized from the round or hook fallback. */
  steps: InvestigationTranscriptStep[];
  /** Raw `ConversationRound.steps` when loaded from Saved Objects, otherwise synthesized tool steps. */
  rawSteps?: ConversationRoundStep[];
  /** Merged tool calls + results suitable for legacy callers or `toToolCallSteps`. */
  toolCalls: InvestigationToolCall[];
}

export interface RawRoundResult {
  type?: string;
  data?: unknown;
}

export interface RawRoundStep {
  type?: string;
  reasoning?: string;
  tool_id?: string;
  tool_call_id?: string;
  params?: Record<string, unknown>;
  results?: RawRoundResult[];
}

/** Attaches each call's results, matched on `tool_call_id`, so the optimizer sees what it returned. */
export const withToolResults = (
  toolCalls: readonly InvestigationToolCall[],
  toolResults: ReadonlyArray<{ tool_call_id: string; results: unknown[] }>
): InvestigationToolCall[] => {
  if (toolResults.length === 0) {
    return [...toolCalls];
  }
  const resultsById = new Map(
    toolResults.map(({ tool_call_id: toolCallId, results }) => [toolCallId, results])
  );
  return toolCalls.map((call) => {
    const results = call.tool_call_id ? resultsById.get(call.tool_call_id) : undefined;
    return results ? { ...call, results } : call;
  });
};

const isNonZeroExitCode = (value: unknown): boolean =>
  typeof value === 'number' && Number.isFinite(value) && value !== 0;

export const extractResultSummary = (
  results: readonly RawRoundResult[] | undefined
): { text?: string; isError: boolean } => {
  if (!results || results.length === 0) {
    return { isError: false };
  }
  const parts: string[] = [];
  let isError = false;
  for (const result of results) {
    const data = result.data;
    if (result.type === 'error') {
      isError = true;
    }
    if (typeof data === 'string') {
      parts.push(data);
    } else if (data && typeof data === 'object') {
      const record = data as Record<string, unknown>;
      if (
        record.is_error === true ||
        record.isError === true ||
        record.success === false ||
        isNonZeroExitCode(record.exit_code) ||
        isNonZeroExitCode(record.exitCode)
      ) {
        isError = true;
      }
      const known = [record.message, record.text, record.stdout, record.stderr].filter(
        (value): value is string => typeof value === 'string' && value.length > 0
      );
      parts.push(known.length > 0 ? known.join('\n') : JSON.stringify(data));
    }
  }
  return { text: parts.join('\n'), isError };
};

/** Normalizes an Agent Builder round's steps (reasoning and tool calls) into transcript steps. */
export const stepsFromRound = (steps: readonly RawRoundStep[]): InvestigationTranscriptStep[] => {
  const out: InvestigationTranscriptStep[] = [];
  for (const step of steps) {
    if (step.type === 'reasoning' && typeof step.reasoning === 'string') {
      out.push({ kind: 'reasoning', text: step.reasoning });
    } else if (step.type === 'tool_call' && typeof step.tool_id === 'string') {
      const { text, isError } = extractResultSummary(step.results);
      out.push({
        kind: 'tool',
        toolId: step.tool_id,
        ...(step.tool_call_id ? { toolCallId: step.tool_call_id } : {}),
        params: step.params ?? {},
        ...(step.results !== undefined ? { results: step.results } : {}),
        resultText: text,
        isError,
      });
    }
  }
  return out;
};

/**
 * Builds transcript steps from the hook's tool calls when they carry results. It has no agent
 * reasoning notes, but each call shows what it returned.
 */
export const stepsFromToolCalls = (
  toolCalls: readonly InvestigationToolCall[]
): InvestigationTranscriptStep[] | undefined => {
  if (!toolCalls.some((call) => call.results !== undefined)) {
    return undefined;
  }
  return stepsFromRound(
    toolCalls.map((call) => ({
      type: 'tool_call',
      tool_id: call.tool_id ?? 'unknown_tool',
      tool_call_id: call.tool_call_id,
      params: call.params,
      results: call.results as RawRoundResult[] | undefined,
    }))
  );
};

const toolCallsFromRoundSteps = (steps: readonly RawRoundStep[]): InvestigationToolCall[] =>
  steps.flatMap((step) => {
    if (step.type !== 'tool_call' || typeof step.tool_id !== 'string') {
      return [];
    }
    return [
      {
        tool_id: step.tool_id,
        ...(step.tool_call_id ? { tool_call_id: step.tool_call_id } : {}),
        params: step.params ?? {},
        ...(step.results !== undefined ? { results: step.results as unknown[] } : {}),
      },
    ];
  });

/** Agent Builder fires the post-execution hook before saving the round, so wait briefly, then fall back. */
export const ROUND_READ_RETRY_DELAYS_MS = [1_000, 2_000] as const;

const sleep = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true }
    );
  });

/**
 * Loads a completed investigation round from Agent Builder Saved Objects (with brief retries
 * when the `afterExecution` hook races round persistence) and falls back to the hook's
 * `tool_calls` + `tool_results` when the stored round cannot be read.
 */
export const loadInvestigationRound = async ({
  agentBuilder,
  request,
  conversationId,
  roundId,
  fallbackToolCalls = [],
  fallbackToolResults = [],
  logger,
  signal,
  retryDelaysMs = ROUND_READ_RETRY_DELAYS_MS,
}: {
  agentBuilder: AgentBuilderPluginStart | undefined;
  request: KibanaRequest;
  conversationId?: string;
  roundId?: string;
  fallbackToolCalls?: readonly InvestigationToolCall[];
  fallbackToolResults?: ReadonlyArray<{ tool_call_id: string; results: unknown[] }>;
  logger: Logger;
  signal?: AbortSignal;
  retryDelaysMs?: readonly number[];
}): Promise<LoadedInvestigationRound> => {
  const mergedFallbackCalls = withToolResults(fallbackToolCalls, fallbackToolResults);

  if (agentBuilder && conversationId && roundId) {
    let lastProblem = '';
    for (let attempt = 0; attempt <= retryDelaysMs.length; attempt++) {
      if (attempt > 0) {
        await sleep(retryDelaysMs[attempt - 1], signal);
        if (signal?.aborted) {
          break;
        }
      }
      try {
        const client = await agentBuilder.conversations.getScopedClient({ request });
        const conversation = await client.get(conversationId);
        const round = conversation.rounds.find(({ id }) => id === roundId);
        if (round) {
          logger.debug(
            `Investigation round loader read round ${roundId} on attempt ${attempt + 1}`
          );
          const rawRoundSteps = round.steps as unknown as RawRoundStep[];
          const steps = stepsFromRound(rawRoundSteps);
          const roundToolCalls = toolCallsFromRoundSteps(rawRoundSteps);
          const traceId = Array.isArray(round.trace_id) ? round.trace_id[0] : round.trace_id;
          return {
            source: 'persisted_round',
            roundId: round.id,
            traceId,
            startedAt: round.started_at,
            steps,
            rawSteps: round.steps,
            toolCalls: roundToolCalls.length > 0 ? roundToolCalls : mergedFallbackCalls,
          };
        }
        lastProblem = 'round not saved yet';
      } catch (error) {
        lastProblem = (error as Error).message;
      }
    }
    logger.warn(
      'Investigation round loader could not read the persisted round; using hook tool calls'
    );
    logger.debug(`Investigation round loader gave up on round ${roundId}: ${lastProblem}`);
  }

  const hookSteps = stepsFromToolCalls(mergedFallbackCalls);
  if (hookSteps) {
    return {
      source: 'hook_tool_calls',
      roundId,
      steps: hookSteps,
      toolCalls: mergedFallbackCalls,
    };
  }

  const paramOnlySteps: InvestigationTranscriptStep[] = mergedFallbackCalls.map((call) => ({
    kind: 'tool',
    toolId: call.tool_id ?? 'unknown_tool',
    ...(call.tool_call_id ? { toolCallId: call.tool_call_id } : {}),
    params: call.params ?? {},
    isError: false,
  }));

  return {
    source: 'tool_call_params_only',
    roundId,
    steps: paramOnlySteps,
    rawSteps: mergedFallbackCalls.map(
      (call, index): ToolCallStep => ({
        type: 'tool_call' as ToolCallStep['type'],
        tool_call_id: call.tool_call_id ?? `investigation-call-${index}`,
        tool_id: call.tool_id ?? 'unknown',
        params: call.params ?? {},
        results: (call.results as ToolResult[] | undefined) ?? [],
      })
    ),
    toolCalls: mergedFallbackCalls,
  };
};
