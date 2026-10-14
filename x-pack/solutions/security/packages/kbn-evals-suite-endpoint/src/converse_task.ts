/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import type { AgentBuilderClient } from '@kbn/evals';

type ConverseResponse = Awaited<ReturnType<AgentBuilderClient['converse']>>;

// Tool confirmation prompt ids are `tools.<toolId>.confirmation[.<toolCallId>]`.
const CONFIRMATION_ID_PATTERN = /^tools\.(.+?)\.confirmation(?:\.(.+))?$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/**
 * Renders a pending HITL confirmation as text for the evaluators. A round that
 * pauses at a write tool's confirmation ends with an empty assistant message,
 * so without this a correct isolate/release/scan request is recorded as nothing.
 * Reports what was requested (tool + arguments); it never claims the action ran.
 */
const describePendingConfirmation = (prompt: unknown, steps: ConverseResponse['steps']): string => {
  if (!isRecord(prompt)) {
    return '';
  }
  const id = typeof prompt.id === 'string' ? prompt.id : '';
  const match = CONFIRMATION_ID_PATTERN.exec(id);
  const toolId = match?.[1];
  const toolCallId = match?.[2];
  const step = steps.find(
    (s) =>
      s.type === 'tool_call' &&
      s.tool_id === toolId &&
      (toolCallId === undefined || s.tool_call_id === toolCallId)
  );

  const lines = [
    `[Pending confirmation — the action has NOT been executed; awaiting the analyst's approval]`,
    ...(toolId ? [`Requested tool: ${toolId}`] : []),
    ...(step?.params ? [`Tool arguments: ${JSON.stringify(step.params)}`] : []),
    ...(typeof prompt.title === 'string' ? [`Confirmation title: ${prompt.title}`] : []),
    ...(typeof prompt.message === 'string' ? [`Confirmation message: ${prompt.message}`] : []),
  ];
  return lines.join('\n');
};

export const converseQuestionToTaskOutput = async (
  agentBuilderClient: AgentBuilderClient,
  question: string
) => {
  const response = await agentBuilderClient.converse({
    agentId: agentBuilderDefaultAgentId,
    input: question,
  });

  const prompts = response.prompts ?? [];
  const pending = prompts
    .map((prompt) => describePendingConfirmation(prompt, response.steps))
    .filter((text) => text.length > 0);
  const message = [response.message, ...pending].filter((text) => text).join('\n\n');

  return {
    messages: [{ message: question }, { message }],
    steps: response.steps,
    errors: [] as unknown[],
    traceId: response.traceId,
    prompts,
  };
};
