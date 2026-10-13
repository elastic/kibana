/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ConversationRoundStatus,
  ConversationRoundStepType,
  ToolResultType,
  type Conversation,
  type ConversationRound,
  type ToolCallStep,
  type ToolResult,
} from '@kbn/agent-builder-common';
import { isSeededWorkspaceRead } from '../cortex/optimize';
import type { InvestigationToolCall } from './accessed_trees';

/**
 * Total tool-result characters the history may carry. The after-execution hook already bounds
 * each result; this keeps a long round from pushing the reinforcement run into compaction, which
 * would replace the tool messages with a summary.
 */
export const MAX_HISTORY_RESULT_CHARS = 200_000;

const omittedResult = (toolCallId: string, reason: string): ToolResult => ({
  tool_result_id: `${toolCallId}-omitted`,
  type: ToolResultType.other,
  data: { omitted: reason },
});

const toToolCallSteps = (toolCalls: InvestigationToolCall[]): ToolCallStep[] => {
  let remainingChars = MAX_HISTORY_RESULT_CHARS;

  return toolCalls.map((call, index) => {
    const toolCallId = call.tool_call_id ?? `investigation-call-${index}`;
    const step = {
      type: ConversationRoundStepType.toolCall,
      tool_call_id: toolCallId,
      tool_id: call.tool_id ?? 'unknown',
      params: call.params ?? {},
    } as const;

    // Every call still gets a result message: an unpaired tool call is rejected by the provider.
    if (!call.results) {
      return { ...step, results: [], interrupted: true };
    }
    if (isSeededWorkspaceRead(call)) {
      return {
        ...step,
        results: [omittedResult(toolCallId, 'Nightshift-seeded workspace file; not evidence')],
      };
    }

    const results = call.results as ToolResult[];
    const size = JSON.stringify(results).length;
    if (size > remainingChars) {
      return {
        ...step,
        results: [omittedResult(toolCallId, 'transcript result budget exhausted')],
      };
    }
    remainingChars -= size;
    return { ...step, results };
  });
};

/**
 * Rebuilds the investigator's completed round so Agent Builder renders it as history: the user
 * prompt, an assistant tool call and tool result message per call, then the final answer.
 */
export const buildInvestigationRound = ({
  roundId,
  prompt,
  response,
  toolCalls,
  startedAt,
}: {
  roundId: string;
  prompt: string;
  response: string;
  toolCalls: InvestigationToolCall[];
  startedAt: string;
}): ConversationRound => ({
  id: roundId,
  status: ConversationRoundStatus.completed,
  input: { message: prompt },
  steps: toToolCallSteps(toolCalls),
  response: { message: response },
  started_at: startedAt,
  time_to_first_token: 0,
  time_to_last_token: 0,
  model_usage: { connector_id: 'unknown', llm_calls: 0, input_tokens: 0, output_tokens: 0 },
});

/** An unpersisted conversation holding only the investigator's round, owned by `agentId`. */
export const buildInvestigationConversation = ({
  conversationId,
  agentId,
  round,
  now,
}: {
  conversationId: string;
  agentId: string;
  round: ConversationRound;
  now: string;
}): Conversation => ({
  id: conversationId,
  agent_id: agentId,
  user: { username: 'nightshift' },
  title: 'Nightshift decision tree reinforcement',
  created_at: now,
  updated_at: now,
  rounds: [round],
});
