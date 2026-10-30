/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationRoundStepType, type ConversationRound } from '@kbn/agent-builder-common';
import type { EvaluateEvidence } from '@kbn/evals-plugin/server';

/** The most tool calls `evaluate()` accepts for one round. */
export const MAX_EVIDENCE_TOOL_CALLS = 200;

/**
 * The evidence judges grade for one round: its user input, tool calls and final response. Keeps
 * the latest tool calls when there are more than `evaluate()` accepts, since the conclusion
 * rests on them.
 */
export const buildOnlineEvalsEvidence = ({
  round,
}: {
  round: ConversationRound;
}): EvaluateEvidence => {
  const toolCalls = round.steps.flatMap((step) =>
    step.type === ConversationRoundStepType.toolCall
      ? [
          {
            tool_call_id: step.tool_call_id,
            tool_id: step.tool_id,
            arguments: step.params,
            result: step.results,
          },
        ]
      : []
  );

  return {
    round: {
      input: { message: round.input.message },
      steps: toolCalls.slice(-MAX_EVIDENCE_TOOL_CALLS),
      response: { message: round.response.message },
    },
  };
};
