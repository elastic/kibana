/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvidenceRound } from '@kbn/evals-plugin/server';
import { z, lazySchema } from '@kbn/zod/v4';

/** Tool arguments and results can be large; each one is cut to this many characters. */
export const MAX_TOOL_FIELD_CHARS = 10_000;
/**
 * Budget for the rendered tool calls, so the prompt fits the judge model's context window.
 * Tool calls past it are counted but not rendered; the input and the answer always are.
 */
export const MAX_TOOL_CALLS_CHARS = 400_000;

/** What judges that read the whole round require: a user input and a final answer. */
export const roundEvidenceSchema = lazySchema(() =>
  z.object({
    input: z.object({ message: z.string().trim().min(1) }),
    response: z.object({ message: z.string().trim().min(1) }),
  })
);

const truncate = (text: string, maxChars: number): string =>
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
  const renderedSteps: string[] = [];
  let usedChars = 0;
  let omitted = 0;

  round.steps.forEach((step, index) => {
    if (usedChars >= MAX_TOOL_CALLS_CHARS) {
      omitted++;
      return;
    }
    const rendered = [
      `## Tool call ${index + 1}: ${step.tool_id ?? 'unknown tool'}`,
      `Arguments:\n${truncate(stringify(step.arguments), MAX_TOOL_FIELD_CHARS)}`,
      `Result:\n${truncate(stringify(step.result), MAX_TOOL_FIELD_CHARS)}`,
    ].join('\n');
    renderedSteps.push(rendered);
    usedChars += rendered.length;
  });

  if (omitted > 0) {
    renderedSteps.push(`[${omitted} more tool calls omitted to fit the judge's context]`);
  }

  return [
    `## User\n${round.input.message}`,
    ...renderedSteps,
    `## Agent final answer\n${round.response.message}`,
  ].join('\n\n');
};
