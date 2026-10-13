/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Message } from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';
import { SUBMIT_BRIEF_TOOL_NAME } from './brief_tool_schema';
import type { SubmittedToolCall } from './compose_brief';

const MAX_PROBLEMS = 20;
const MAX_PROBLEM_LENGTH = 400;

const REPAIR_INSTRUCTIONS = `The brief was rejected. Fix every problem listed and call ${SUBMIT_BRIEF_TOOL_NAME} again with the complete corrected brief (the verdict and every area, not only the fixed parts). Keep what was not listed. Cite only ids from the evidence and quote only numbers from the facts you cite.`;

const clip = (text: string): string =>
  text.length > MAX_PROBLEM_LENGTH ? `${text.slice(0, MAX_PROBLEM_LENGTH - 1)}…` : text;

/** The problems, bounded so a pathological output can't blow up the follow-up prompt. */
const formatProblems = (errors: readonly string[]): string[] => {
  const shown = errors.slice(0, MAX_PROBLEMS).map(clip);
  return errors.length > MAX_PROBLEMS
    ? [...shown, `…and ${errors.length - MAX_PROBLEMS} more problems.`]
    : shown;
};

/**
 * Follow-up messages for the single repair round-trip. When the model made a tool call, the
 * problems go back as that call's tool response; otherwise as a user message.
 */
export const buildRepairMessages = ({
  toolCall,
  errors,
}: {
  toolCall?: SubmittedToolCall;
  errors: readonly string[];
}): Message[] => {
  const problems = formatProblems(errors);
  if (!toolCall) {
    return [
      {
        role: MessageRole.User,
        content: `${REPAIR_INSTRUCTIONS}\n\nProblems:\n${problems.map((p) => `- ${p}`).join('\n')}`,
      },
    ];
  }
  return [
    {
      role: MessageRole.Assistant,
      content: '',
      toolCalls: [
        {
          toolCallId: toolCall.toolCallId,
          function: { name: SUBMIT_BRIEF_TOOL_NAME, arguments: toolCall.arguments },
        },
      ],
    },
    {
      role: MessageRole.Tool,
      name: SUBMIT_BRIEF_TOOL_NAME,
      toolCallId: toolCall.toolCallId,
      response: { status: 'rejected', instructions: REPAIR_INSTRUCTIONS, problems },
    },
  ];
};
