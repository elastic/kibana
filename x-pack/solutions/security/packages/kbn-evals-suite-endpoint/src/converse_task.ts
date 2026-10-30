/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import type { AgentBuilderClient } from '@kbn/evals';

// Tool confirmation prompt ids are `tools.<toolId>.confirmation[.<toolCallId>]`.
const CONFIRMATION_ID_PATTERN = /^tools\.(.+?)\.confirmation(?:\.(.+))?$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export interface PendingConfirmation {
  tool_id: string;
  tool_call_id?: string;
}

/**
 * Which tool calls the round paused on, taken from the confirmation prompt ids.
 *
 * Deliberately only identifies the call — never the card's title or message.
 * That text is rendered by the tool, not the model, so letting the judge read it
 * would let a criterion such as "isolated eval-host-isolate" pass on template
 * wording. The model's own contribution (tool id and arguments) stays in
 * `steps`, and `messages` carries only what the model said.
 */
const toPendingConfirmations = (prompts: unknown[]): PendingConfirmation[] =>
  prompts.flatMap((prompt) => {
    const id = isRecord(prompt) && typeof prompt.id === 'string' ? prompt.id : '';
    const match = CONFIRMATION_ID_PATTERN.exec(id);

    return match
      ? [{ tool_id: match[1], ...(match[2] !== undefined ? { tool_call_id: match[2] } : {}) }]
      : [];
  });

export const converseQuestionToTaskOutput = async (
  agentBuilderClient: AgentBuilderClient,
  question: string,
  options: {
    /**
     * Adds `pending_confirmations` to the output. A write tool's round ends
     * paused on a confirmation with an empty assistant message, so without it a
     * correct isolate/release/scan request is indistinguishable from no
     * request. Opt-in so suites whose tools never ask (forensic, troubleshooting)
     * and suites with baselines of their own (policy management) keep their
     * judged output unchanged.
     */
    includePendingConfirmations?: boolean;
  } = {}
) => {
  const response = await agentBuilderClient.converse({
    agentId: agentBuilderDefaultAgentId,
    input: question,
  });

  return {
    messages: [{ message: question }, { message: response.message }],
    steps: response.steps,
    errors: [] as unknown[],
    traceId: response.traceId,
    ...(options.includePendingConfirmations
      ? { pending_confirmations: toPendingConfirmations(response.prompts ?? []) }
      : {}),
  };
};
