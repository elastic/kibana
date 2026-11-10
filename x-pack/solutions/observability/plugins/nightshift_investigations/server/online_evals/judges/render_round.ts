/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvidenceRound } from '@kbn/evals-plugin/server';
import { sanitizeToolId } from '@kbn/agent-builder-genai-utils/langchain';
import { MessageRole, type Message, type ToolCallArguments } from '@kbn/inference-common';
import { z, lazySchema } from '@kbn/zod/v4';
import { keepHeadAndTail } from '../keep_head_and_tail';

/** Tool arguments and results can be large; each one is cut to this many characters. */
export const MAX_TOOL_FIELD_CHARS = 10_000;
/**
 * Budget for the rendered tool calls, so the prompt fits the judge model's context window.
 * When the calls don't fit, the first and last ones are rendered and those between them are
 * counted instead (see `keepHeadAndTail`); the input and the answer always are rendered.
 */
export const MAX_TOOL_CALLS_CHARS = 400_000;

/** What judges that read the whole round require: a user input and a final answer. */
export const roundEvidenceSchema = lazySchema(() =>
  z.object({
    input: z.object({ message: z.string().trim().min(1) }),
    response: z.object({ message: z.string().trim().min(1) }),
  })
);

/** Cuts text to `maxChars` and appends a marker with the number of characters cut. */
export const truncate = (text: string, maxChars: number): string =>
  text.length > maxChars
    ? `${text.slice(0, maxChars)}\n[truncated ${text.length - maxChars} characters]`
    : text;

const stringify = (value: unknown): string => {
  if (value === undefined) {
    return '';
  }
  return typeof value === 'string' ? value : JSON.stringify(value);
};

/**
 * Renders the round as the transcript reference-free judges read: the user input, every tool
 * call with its arguments and result, and the agent's final answer.
 */
export const renderRound = (round: EvidenceRound): string => {
  const renderedSteps = round.steps.map((step, index) =>
    [
      `## Tool call ${index + 1}: ${step.tool_id ?? 'unknown tool'}`,
      `Arguments:\n${truncate(stringify(step.arguments), MAX_TOOL_FIELD_CHARS)}`,
      `Result:\n${truncate(stringify(step.result), MAX_TOOL_FIELD_CHARS)}`,
    ].join('\n')
  );
  const { headEnd, tailStart, omitted } = keepHeadAndTail(
    renderedSteps.map(({ length }) => length),
    MAX_TOOL_CALLS_CHARS
  );
  const omittedMarker =
    omitted > 0 ? [`[${omitted} tool calls omitted here to fit the judge's context]`] : [];

  return [
    `## User\n${round.input.message}`,
    ...renderedSteps.slice(0, headEnd),
    ...omittedMarker,
    ...renderedSteps.slice(tailStart),
    `## Agent final answer\n${round.response.message}`,
  ].join('\n\n');
};

const toToolCallArguments = (value: unknown): ToolCallArguments => {
  const serialized = stringify(value);
  if (serialized.length > MAX_TOOL_FIELD_CHARS) {
    return { arguments: truncate(serialized, MAX_TOOL_FIELD_CHARS) };
  }
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as ToolCallArguments)
    : { value };
};

/**
 * Renders the round as the conversation the agent had: the user input, then each tool call as an
 * assistant message (carrying the agent's note before the call, when it wrote one) followed by its
 * tool result, then the agent's final answer as an assistant message, unless `includeFinalAnswer`
 * is false. Tool calls left out to fit the character budget, from the middle of the round, are
 * counted in `omittedToolCalls`; the kept calls keep their position in their ids.
 */
export const renderTraceMessages = (
  round: EvidenceRound,
  { includeFinalAnswer = true }: { includeFinalAnswer?: boolean } = {}
): { messages: Message[]; omittedToolCalls: number } => {
  const renderedSteps = round.steps.map((step, index) => {
    // Ids only pair a call with its result. Providers restrict their characters, so don't reuse the agent's.
    const toolCallId = `call_${index + 1}`;
    // The same normalization Agent Builder applies to tool names it sends to a provider.
    const name = sanitizeToolId(step.tool_id ?? 'unknown_tool');
    const args = toToolCallArguments(step.arguments);
    const response = truncate(stringify(step.result), MAX_TOOL_FIELD_CHARS) || '(empty)';
    const note = step.reasoning ? truncate(step.reasoning, MAX_TOOL_FIELD_CHARS) : null;
    const stepMessages: Message[] = [
      {
        role: MessageRole.Assistant,
        content: note,
        toolCalls: [{ toolCallId, function: { name, arguments: args } }],
      },
      { role: MessageRole.Tool, name, toolCallId, response: { result: response } },
    ];
    return {
      stepMessages,
      size: JSON.stringify(args).length + response.length + (note?.length ?? 0),
    };
  });
  const { headEnd, tailStart, omitted } = keepHeadAndTail(
    renderedSteps.map(({ size }) => size),
    MAX_TOOL_CALLS_CHARS
  );

  const messages: Message[] = [
    { role: MessageRole.User, content: round.input.message },
    ...[...renderedSteps.slice(0, headEnd), ...renderedSteps.slice(tailStart)].flatMap(
      ({ stepMessages }) => stepMessages
    ),
  ];
  if (includeFinalAnswer) {
    messages.push({ role: MessageRole.Assistant, content: round.response.message });
  }
  return { messages, omittedToolCalls: omitted };
};
