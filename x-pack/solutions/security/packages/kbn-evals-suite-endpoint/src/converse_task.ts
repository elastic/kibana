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

/**
 * A turn after the first, sent in the same conversation:
 * - `{ confirm }` answers every confirmation the previous turn paused on with
 *   `allow: confirm`, the way the UI's Approve / Decline buttons do.
 * - `{ message }` sends another user message.
 */
export type FollowUpTurn = { confirm: boolean } | { message: string };

export interface ConfirmationDecision extends PendingConfirmation {
  allow: boolean;
}

const confirmationPromptIds = (prompts: unknown[]): string[] =>
  prompts.flatMap((prompt) => {
    const id = isRecord(prompt) && typeof prompt.id === 'string' ? prompt.id : '';
    return CONFIRMATION_ID_PATTERN.test(id) ? [id] : [];
  });

const toDecision = (promptId: string, allow: boolean): ConfirmationDecision => {
  const [confirmation] = toPendingConfirmations([{ id: promptId }]);
  return { ...confirmation, allow };
};

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
    /**
     * Turns sent after the first, in the same conversation. Steps, messages and
     * pending confirmations from every turn accumulate in the output, so a
     * criterion can check what happened after an approval or a decline, not just
     * the first request. A `{ confirm }` turn with nothing pending ends the
     * conversation and records an error instead of sending an unanswerable turn.
     */
    followUps?: readonly FollowUpTurn[];
  } = {}
) => {
  const { followUps = [], includePendingConfirmations } = options;

  let response = await agentBuilderClient.converse({
    agentId: agentBuilderDefaultAgentId,
    input: question,
  });

  const messages: Array<{ message: string }> = [
    { message: question },
    { message: response.message },
  ];
  const steps = [...response.steps];
  const errors: unknown[] = [];
  const pendingConfirmations = toPendingConfirmations(response.prompts ?? []);
  const confirmationDecisions: ConfirmationDecision[] = [];

  for (const followUp of followUps) {
    const { conversationId } = response;
    if (!conversationId) {
      errors.push({ message: 'Cannot continue: the first turn returned no conversation id.' });
      break;
    }

    let next: Awaited<ReturnType<AgentBuilderClient['converse']>>;
    if ('confirm' in followUp) {
      const promptIds = confirmationPromptIds(response.prompts ?? []);
      if (promptIds.length === 0) {
        errors.push({
          message: `Cannot ${
            followUp.confirm ? 'approve' : 'decline'
          }: the previous turn left no pending confirmation.`,
        });
        break;
      }

      const { confirm: allow } = followUp;
      confirmationDecisions.push(...promptIds.map((id) => toDecision(id, allow)));
      messages.push({ message: allow ? '[approved]' : '[declined]' });
      next = await agentBuilderClient.converse({
        agentId: agentBuilderDefaultAgentId,
        conversationId,
        promptResponses: Object.fromEntries(promptIds.map((id) => [id, { allow }])),
      });
    } else {
      messages.push({ message: followUp.message });
      next = await agentBuilderClient.converse({
        agentId: agentBuilderDefaultAgentId,
        conversationId,
        input: followUp.message,
      });
    }

    response = next;
    messages.push({ message: response.message });
    steps.push(...response.steps);
    pendingConfirmations.push(...toPendingConfirmations(response.prompts ?? []));
  }

  return {
    messages,
    steps,
    errors,
    traceId: response.traceId,
    ...(includePendingConfirmations
      ? {
          pending_confirmations: pendingConfirmations,
          ...(confirmationDecisions.length > 0
            ? { confirmation_decisions: confirmationDecisions }
            : {}),
        }
      : {}),
  };
};
