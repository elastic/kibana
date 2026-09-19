/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { AgentPromptType } from '@kbn/agent-builder-common/agents/prompts';
import { ToolResultType, type ErrorResult } from '@kbn/agent-builder-common/tools';
import type { AgentBuilderClient, ConverseStep } from '@kbn/evals';

/**
 * Maximum number of continuation rounds spent answering prompts. Matches
 * `MAX_AUTO_CONFIRM_ROUNDS` in the agent-builder suite's chat client: a run that
 * keeps asking for permission is stuck, and the recorded prompts are what shows
 * that.
 */
const MAX_PROMPT_ROUNDS = 3;

/** A prompt the agent raised mid-run, with the answer the harness gave it. */
export interface RecordedPrompt {
  id: string;
  type: string;
  /** The refusal sent for this prompt; absent when the harness had no answer. */
  answer?: Record<string, unknown>;
}

/** A tool failure recorded in the transcript. */
export interface RecordedToolError {
  tool_id?: string;
  message: string;
}

export interface ConverseTaskOutput {
  messages: Array<{ message: string }>;
  steps: ConverseStep[];
  errors: RecordedToolError[];
  prompts: RecordedPrompt[];
  traceId?: string;
}

interface PendingPrompt {
  id: string;
  type: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Reads the prompts the agent is waiting on. The client types them as
 * `unknown[]` because they are passed through from the converse response, so
 * only the fields this harness needs are read.
 */
const readPendingPrompts = (prompts: unknown[] | undefined): PendingPrompt[] =>
  (prompts ?? [])
    .filter(isRecord)
    .filter(
      (prompt): prompt is { id: string; type: string } =>
        typeof prompt.id === 'string' && typeof prompt.type === 'string'
    )
    .map((prompt) => ({ id: prompt.id, type: prompt.type }));

/**
 * How the harness answers a prompt the agent raises mid-run.
 *
 * A destructive API call with no pre-approval returns
 * `prompts.askForConfirmation(...)` instead of a result (agent-builder
 * `execute.ts`), and the run then waits for a human. Dropping that prompt — what
 * this harness used to do — stored a run whose final message was empty, which is
 * indistinguishable from a genuine failure and hides whether the agent asked for
 * permission or simply broke.
 *
 * Confirmations and authorizations are therefore answered with a refusal: an
 * evaluation must never approve a state-changing action on the analyst's behalf
 * (the agent-builder suite's `autoConfirm` allows them; approving here would run
 * the destructive API against the shared cluster). The agent continues from the
 * refusal ("The user declined the destructive call to …"), which leaves a
 * complete transcript and lets the row's evaluators score the write attempt
 * itself. `ask_user_question` has no generic answer and is left unanswered — the
 * prompt is recorded and the run stops there.
 */
const answerPrompt = (prompt: PendingPrompt): Record<string, unknown> | undefined => {
  switch (prompt.type) {
    case AgentPromptType.confirmation:
      return { allow: false };
    case AgentPromptType.authorization:
      return { authorized: false };
    default:
      return undefined;
  }
};

/** A tool result that reports a failure — the error branch of `ToolResult`. */
const isToolErrorResult = (result: unknown): result is ErrorResult =>
  isRecord(result) && result.type === ToolResultType.error;

/**
 * Tool failures the run recorded. This used to be a hardcoded `[]`, which every
 * stored run read as "no error occurred" — including the runs whose destructive
 * call was refused. Harness-level failures still reject the task instead of
 * being recorded here.
 */
const collectToolErrors = (steps: readonly ConverseStep[]): RecordedToolError[] =>
  steps.flatMap((step) =>
    (step.results ?? []).filter(isToolErrorResult).map((result) => ({
      ...(step.tool_id ? { tool_id: step.tool_id } : {}),
      message: result.data.message,
    }))
  );

export const converseQuestionToTaskOutput = async (
  agentBuilderClient: AgentBuilderClient,
  question: string
): Promise<ConverseTaskOutput> => {
  const response = await agentBuilderClient.converse({
    agentId: agentBuilderDefaultAgentId,
    input: question,
  });

  // The first round's trace: it carries the skill load and the tool calls the
  // trace-based evaluators query, and the worker's traceparent keeps the
  // continuation rounds on that same trace.
  const traceId = response.traceId;
  const steps: ConverseStep[] = [...response.steps];
  const messages: Array<{ message: string }> = [
    { message: question },
    { message: response.message },
  ];
  const prompts: RecordedPrompt[] = [];

  let conversationId = response.conversationId;
  let pending = readPendingPrompts(response.prompts);

  for (let round = 0; pending.length > 0; round++) {
    const answers = new Map<string, Record<string, unknown>>();
    for (const prompt of pending) {
      const answer = answerPrompt(prompt);
      if (answer) {
        answers.set(prompt.id, answer);
      }
    }

    // Prompts can only be answered on the same conversation, and only within
    // the round cap. Otherwise they are recorded without an answer: the run
    // stopped waiting for a human, and saying anything else would be a lie
    // about what the agent received.
    const canContinue = answers.size > 0 && Boolean(conversationId) && round < MAX_PROMPT_ROUNDS;

    for (const prompt of pending) {
      const answer = canContinue ? answers.get(prompt.id) : undefined;
      prompts.push({ id: prompt.id, type: prompt.type, ...(answer ? { answer } : {}) });
    }

    // `ask_user_question` has no generic answer, so nothing here can continue
    // the run.
    if (!canContinue) {
      break;
    }

    const continuation = await agentBuilderClient.converse({
      agentId: agentBuilderDefaultAgentId,
      conversationId,
      promptResponses: Object.fromEntries(answers),
    });

    conversationId = continuation.conversationId ?? conversationId;
    steps.push(...continuation.steps);
    messages.push({ message: continuation.message });
    pending = readPendingPrompts(continuation.prompts);
  }

  return {
    messages,
    steps,
    errors: collectToolErrors(steps),
    prompts,
    traceId,
  };
};
