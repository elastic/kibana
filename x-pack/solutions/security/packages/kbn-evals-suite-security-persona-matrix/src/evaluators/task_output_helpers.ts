/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export interface ToolCallStep {
  tool_id: string;
  params: Record<string, unknown>;
}

export const getSteps = (output: unknown): Array<Record<string, unknown>> => {
  const steps = isRecord(output) ? output.steps : undefined;
  return Array.isArray(steps) ? steps.filter(isRecord) : [];
};

/** Tool calls in execution order, with params (which `getToolCallSteps` drops). */
export const getOrderedToolCalls = (output: unknown): ToolCallStep[] =>
  getSteps(output).flatMap((step) =>
    step.type === 'tool_call' && typeof step.tool_id === 'string'
      ? [{ tool_id: step.tool_id, params: isRecord(step.params) ? step.params : {} }]
      : []
  );

/** The closing message text, whether or not it came from the fallback step. */
export const getAnswerText = (output: unknown): string => {
  const messages = isRecord(output) ? output.messages : undefined;
  if (!Array.isArray(messages) || messages.length === 0) return '';
  const last = messages[messages.length - 1];
  return isRecord(last) && typeof last.message === 'string' ? last.message : '';
};

/**
 * The model's real closing message. A 'last_assistant_step' message is interior
 * narration promoted by the chat client, so it does not count as an answer.
 */
export const getClosingAnswer = (output: unknown): string =>
  isRecord(output) && output.messageSource === 'last_assistant_step' ? '' : getAnswerText(output);
