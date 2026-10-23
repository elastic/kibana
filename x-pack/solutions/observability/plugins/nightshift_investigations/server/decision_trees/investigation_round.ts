/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ConversationRoundStatus,
  ConversationRoundStepType,
  isReasoningStep,
  isToolCallStep,
  ToolResultType,
  type Conversation,
  type ConversationRound,
  type ConversationRoundStep,
  type ReasoningStep,
  type ToolCallStep,
  type ToolResult,
} from '@kbn/agent-builder-common';
import {
  isSeededWorkspaceAccess,
  OMITTED_SEEDED_RESULT_REASON,
  type InvestigationTranscriptStep,
} from '../investigation_round';
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

const toSingleToolCallStep = (
  call: InvestigationToolCall & { tool_call_group_id?: string },
  index: number,
  budget: { remainingChars: number }
): ToolCallStep => {
  const toolCallId = call.tool_call_id ?? `investigation-call-${index}`;
  const step: Omit<ToolCallStep, 'results'> = {
    type: ConversationRoundStepType.toolCall,
    tool_call_id: toolCallId,
    tool_id: call.tool_id ?? 'unknown',
    params: call.params ?? {},
    ...(call.tool_call_group_id ? { tool_call_group_id: call.tool_call_group_id } : {}),
  };

  // Every call still gets a result message: an unpaired tool call is rejected by the provider.
  if (!call.results) {
    return { ...step, results: [], interrupted: true };
  }
  if (isSeededWorkspaceAccess(call.tool_id, call.params)) {
    return {
      ...step,
      results: [omittedResult(toolCallId, OMITTED_SEEDED_RESULT_REASON)],
    };
  }

  const results = call.results as ToolResult[];
  const size = JSON.stringify(results).length;
  if (size > budget.remainingChars) {
    return {
      ...step,
      results: [omittedResult(toolCallId, 'transcript result budget exhausted')],
    };
  }
  budget.remainingChars -= size;
  return { ...step, results };
};

interface NormalizedCandidateStep {
  kind: 'reasoning' | 'tool';
  text?: string;
  toolId?: string;
  toolCallId?: string;
  toolCallGroupId?: string;
  params?: Record<string, unknown>;
  results?: unknown[];
}

const normalizeCandidateSteps = ({
  rawSteps,
  steps,
}: {
  rawSteps?: readonly ConversationRoundStep[];
  steps?: readonly InvestigationTranscriptStep[];
}): NormalizedCandidateStep[] | undefined => {
  if (rawSteps && rawSteps.length > 0) {
    const out: NormalizedCandidateStep[] = [];
    for (const step of rawSteps) {
      if (isReasoningStep(step)) {
        out.push({
          kind: 'reasoning',
          text: step.reasoning,
          toolCallId: step.tool_call_id,
          toolCallGroupId: step.tool_call_group_id,
        });
      } else if (isToolCallStep(step)) {
        out.push({
          kind: 'tool',
          toolId: step.tool_id,
          toolCallId: step.tool_call_id,
          toolCallGroupId: step.tool_call_group_id,
          params: step.params,
          results: step.results,
        });
      }
    }
    if (out.length > 0) {
      return out;
    }
  }

  if (steps && steps.length > 0) {
    return steps.map((step) => {
      if (step.kind === 'reasoning') {
        const extra = step as { toolCallId?: string; toolCallGroupId?: string };
        return {
          kind: 'reasoning',
          text: step.text,
          toolCallId: extra.toolCallId,
          toolCallGroupId: extra.toolCallGroupId,
        };
      }
      const extra = step as { toolCallGroupId?: string };
      return {
        kind: 'tool',
        toolId: step.toolId,
        toolCallId: step.toolCallId,
        toolCallGroupId: extra.toolCallGroupId,
        params: step.params,
        results: step.results,
      };
    });
  }

  return undefined;
};

const toRoundSteps = ({
  toolCalls,
  steps,
  rawSteps,
}: {
  toolCalls: InvestigationToolCall[];
  steps?: readonly InvestigationTranscriptStep[];
  rawSteps?: readonly ConversationRoundStep[];
}): ConversationRoundStep[] => {
  const budget = { remainingChars: MAX_HISTORY_RESULT_CHARS };
  const candidates = normalizeCandidateSteps({ rawSteps, steps });

  if (candidates && candidates.length > 0) {
    const out: ConversationRoundStep[] = [];
    const pendingUngroupedReasoning: ReasoningStep[] = [];
    let toolIndex = 0;
    let groupCounter = 0;
    let activeSyntheticGroupId: string | undefined;
    let lastGroupId: string | undefined;

    for (const candidate of candidates) {
      if (candidate.kind === 'reasoning') {
        activeSyntheticGroupId = undefined;
        const text = candidate.text ?? '';
        if (text.trim().length === 0) {
          continue;
        }
        const reasoningStep: ReasoningStep = {
          type: ConversationRoundStepType.reasoning,
          reasoning: text,
          ...(candidate.toolCallId ? { tool_call_id: candidate.toolCallId } : {}),
          ...(candidate.toolCallGroupId ? { tool_call_group_id: candidate.toolCallGroupId } : {}),
        };
        if (reasoningStep.tool_call_id || reasoningStep.tool_call_group_id) {
          out.push(reasoningStep);
        } else {
          pendingUngroupedReasoning.push(reasoningStep);
        }
        continue;
      }

      let groupId = candidate.toolCallGroupId;
      if (pendingUngroupedReasoning.length > 0) {
        groupId = groupId ?? `investigation-group-${groupCounter++}`;
        for (const pending of pendingUngroupedReasoning) {
          pending.tool_call_group_id = groupId;
          out.push(pending);
        }
        pendingUngroupedReasoning.length = 0;
        activeSyntheticGroupId = candidate.toolCallGroupId ? undefined : groupId;
      } else if (!groupId && activeSyntheticGroupId) {
        groupId = activeSyntheticGroupId;
      }

      const toolStep = toSingleToolCallStep(
        {
          tool_id: candidate.toolId,
          tool_call_id: candidate.toolCallId,
          tool_call_group_id: groupId,
          params: candidate.params,
          results: candidate.results,
        },
        toolIndex,
        budget
      );
      out.push(toolStep);
      lastGroupId = toolStep.tool_call_group_id;
      toolIndex += 1;
    }

    for (const trailing of pendingUngroupedReasoning) {
      if (lastGroupId) {
        trailing.tool_call_group_id = lastGroupId;
      }
      out.push(trailing);
    }

    return out;
  }

  return toolCalls.map((call, index) => toSingleToolCallStep(call, index, budget));
};

/**
 * Rebuilds the investigator's completed round so Agent Builder renders it as history: the user
 * prompt, the investigator's reasoning notes and an assistant tool call + tool result message per
 * call, then the final answer.
 */
export const buildInvestigationRound = ({
  roundId,
  prompt,
  response,
  toolCalls,
  steps,
  rawSteps,
  startedAt,
}: {
  roundId: string;
  prompt: string;
  response: string;
  toolCalls: InvestigationToolCall[];
  steps?: readonly InvestigationTranscriptStep[];
  rawSteps?: readonly ConversationRoundStep[];
  startedAt: string;
}): ConversationRound => ({
  id: roundId,
  status: ConversationRoundStatus.completed,
  input: { message: prompt },
  steps: toRoundSteps({ toolCalls, steps, rawSteps }),
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
