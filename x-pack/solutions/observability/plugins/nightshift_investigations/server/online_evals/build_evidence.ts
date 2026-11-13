/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationRoundStepType, type ConversationRound } from '@kbn/agent-builder-common';
import type { EvaluateEvidence, ToolCallEvidence } from '@kbn/evals-plugin/server';
import { keepHeadAndTail } from './keep_head_and_tail';

/** The most tool calls `evaluate()` accepts for one round. */
export const MAX_EVIDENCE_TOOL_CALLS = 200;

/**
 * The evidence judges grade for one round: its user input, tool calls and final response. When
 * there are more tool calls than `evaluate()` accepts, keeps the first and last ones, as the
 * judges' renderer does within its prompt budget; the final response is always included. An
 * alert outcome, the recovery round's conclusion, is the ground truth the round is graded against.
 * The agent's notes after its last tool call, where it draws its conclusion before answering,
 * have no tool call to sit on, so they travel as `closing_reasoning` for the judges that read them.
 */
export const buildOnlineEvalsEvidence = ({
  round,
  alertOutcome,
}: {
  round: ConversationRound;
  alertOutcome?: string;
}): EvaluateEvidence => {
  const boundNotes = new Map<string, string[]>();
  for (const step of round.steps) {
    const note = step.type === ConversationRoundStepType.reasoning ? step.reasoning.trim() : '';
    if (note && step.type === ConversationRoundStepType.reasoning && step.tool_call_id) {
      boundNotes.set(step.tool_call_id, [...(boundNotes.get(step.tool_call_id) ?? []), note]);
    }
  }

  // A note not bound to a call belongs to the call that follows it; those with no call after it
  // are the closing reasoning.
  let pendingNotes: string[] = [];
  const toolCalls: ToolCallEvidence[] = [];
  for (const step of round.steps) {
    if (step.type === ConversationRoundStepType.reasoning) {
      const note = step.reasoning.trim();
      if (note && !step.tool_call_id) {
        pendingNotes.push(note);
      }
    } else if (step.type === ConversationRoundStepType.toolCall) {
      const reasoning = [...(boundNotes.get(step.tool_call_id) ?? []), ...pendingNotes].join('\n');
      pendingNotes = [];
      toolCalls.push({
        tool_call_id: step.tool_call_id,
        tool_id: step.tool_id,
        ...(reasoning ? { reasoning } : {}),
        arguments: step.params,
        result: step.results,
      });
    }
  }

  const { headEnd, tailStart } = keepHeadAndTail(
    toolCalls.map(() => 1),
    MAX_EVIDENCE_TOOL_CALLS
  );
  const closingReasoning = pendingNotes.join('\n');
  const referenceData = {
    ...(alertOutcome === undefined ? {} : { alert_outcome: alertOutcome }),
    ...(closingReasoning ? { closing_reasoning: closingReasoning } : {}),
  };

  return {
    round: {
      input: { message: round.input.message },
      steps: [...toolCalls.slice(0, headEnd), ...toolCalls.slice(tailStart)],
      response: { message: round.response.message },
    },
    ...(Object.keys(referenceData).length > 0 ? { reference_data: referenceData } : {}),
  };
};
