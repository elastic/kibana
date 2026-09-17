/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { isConfirmationPrompt, type ConfirmationPrompt } from '@kbn/agent-builder-common/agents';
import type { AgentBuilderClient } from '@kbn/evals';

/**
 * How the eval task answers `confirmation` prompts raised by HITL-gated tools.
 *
 * - `stop` (default): send a single turn and return — the historical behaviour of
 *   the non-interactive eval harness. A tool whose policy is `askUser: 'always'`
 *   parks the round on a confirmation prompt that nobody answers, so the tool
 *   handler never runs and its call never reaches the task output.
 * - `allow`: answer pending confirmation prompts as approved and resume the
 *   conversation, so confirmation-gated tools actually execute inside the eval.
 *   This models the analyst clicking "confirm" in the UI — the behaviour under
 *   test is that the agent *proposed* the right action, not that a human approved
 *   it. Rows asserting that an action must NOT happen are unaffected: they are
 *   scored by `ForbiddenToolCalls`, and an executed call is at least as visible
 *   as a declined one.
 */
export type ConfirmationPolicy = 'stop' | 'allow';

/**
 * Guard against an unbounded prompt/resume loop (e.g. a tool that re-prompts
 * every round). Five is comfortably above the one or two rounds a single
 * confirmation-gated call needs.
 */
const MAX_CONFIRMATION_ROUNDS = 5;

export const converseQuestionToTaskOutput = async (
  agentBuilderClient: AgentBuilderClient,
  question: string,
  { confirmations = 'stop' }: { confirmations?: ConfirmationPolicy } = {}
) => {
  let response = await agentBuilderClient.converse({
    agentId: agentBuilderDefaultAgentId,
    input: question,
  });

  const messages = [{ message: question }, { message: response.message }];
  // A confirmation-gated call emits its tool-call step on the resumed round, so
  // steps are accumulated across rounds rather than replaced. Concatenating is
  // the safe superset: the trajectory evaluator scores order by longest common
  // subsequence against the golden and coverage by set intersection, so a
  // repeated id cannot score above the golden and no expected call is lost.
  const steps = [...response.steps];
  let traceId = response.traceId;

  let rounds = 0;
  while (confirmations === 'allow' && response.conversationId && rounds < MAX_CONFIRMATION_ROUNDS) {
    const pending = response.prompts.filter((prompt): prompt is ConfirmationPrompt =>
      isConfirmationPrompt(prompt as ConfirmationPrompt)
    );
    if (pending.length === 0) {
      break;
    }

    const promptResponses = Object.fromEntries(
      pending.map((prompt) => [prompt.id, { allow: true }])
    );

    response = await agentBuilderClient.converse({
      agentId: agentBuilderDefaultAgentId,
      conversationId: response.conversationId,
      promptResponses,
    });

    messages.push({ message: response.message });
    steps.push(...response.steps);
    // The server nests its spans under the eval worker's trace, so every round
    // of the same task shares a trace id; keep the last non-empty one.
    traceId = response.traceId ?? traceId;
    rounds += 1;
  }

  return {
    messages,
    steps,
    errors: [] as unknown[],
    traceId,
  };
};
