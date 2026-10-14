/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
// Eval-harness capture side-channel: writes the verbatim model answer to a
// local gitignored JSONL for offline report rendering.
// eslint-disable-next-line @kbn/eslint/require_kbn_fs, import/no-nodejs-modules
import { appendFileSync } from 'fs';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { withRetry } from '@kbn/evals';

/** Maximum number of auto-confirm continuation calls per query. */
export const MAX_AUTO_CONFIRM_ROUNDS = 3;

/** Prefix of the final message when a round ends paused on a prompt the eval cannot answer. */
export const UNANSWERED_PROMPT_MARKER = '[UNANSWERED_PROMPT]';

interface ConverseStep {
  type?: string;
  tool_id?: string;
  tool_call_id?: string;
  params?: Record<string, unknown>;
  results?: unknown[];
  [k: string]: unknown;
}

/**
 * Standard task-output shape consumed by the shared `@kbn/evals` evaluators
 * (`correctness`, `groundedness`): `messages[last].message` is the real
 * converse answer, and `errors` is always present (even if empty) so the
 * eval report has a stable column to read. Mirrors `ConverseResponse` in
 * `kbn-evals-suite-alerts-rag/src/chat_client.ts`.
 */
export interface ConverseResponse {
  messages: Array<{ message: string }>;
  steps: ConverseStep[];
  errors: Array<{
    error: { message: string; stack?: string };
    type: 'error' | 'unanswered_prompt';
  }>;
  conversationId?: string;
  traceId?: string | null;
}

interface ConverseApiPrompt {
  id?: string;
  type?: string;
  title?: string;
  message?: string;
  connector_name?: string;
  questions?: Array<{ question?: string }>;
}

interface ConverseApiResponse {
  conversation_id?: string;
  trace_id?: string;
  steps?: ConverseStep[];
  response?: { message?: string; prompts?: ConverseApiPrompt[] };
}

/** Allow every `confirmation` prompt in one response; other prompt types are not answered. */
const getConfirmationPrompts = (response?: {
  prompts?: ConverseApiPrompt[];
}): Record<string, { allow: true }> => {
  const answers: Record<string, { allow: true }> = {};
  for (const prompt of response?.prompts ?? []) {
    if (prompt?.id && prompt.type === 'confirmation') {
      answers[prompt.id] = { allow: true };
    }
  }
  return answers;
};

const describePrompt = (prompt: ConverseApiPrompt): string => {
  const questions = (prompt.questions ?? [])
    .map((q) => q.question)
    .filter((q): q is string => Boolean(q));
  if (questions.length) return questions.join(' | ');
  return prompt.message ?? prompt.title ?? prompt.connector_name ?? 'no prompt text';
};

export class PersonaMatrixChatClient {
  constructor(
    private readonly fetch: HttpHandler,
    private readonly log: ToolingLog,
    private readonly connectorId: string
  ) {}

  async query(input: string, attachment?: string): Promise<ConverseResponse> {
    const call = async (): Promise<ConverseResponse> => {
      const body: Record<string, unknown> = {
        agent_id: agentBuilderDefaultAgentId,
        connector_id: this.connectorId,
        input,
        // Run inline so the eval worker's W3C traceparent propagates
        // to the agent's server-side gen_ai spans.
        _execution_mode: 'local',
      };

      if (attachment) {
        body.attachments = [{ type: 'text', data: { content: attachment } }];
      }

      const post = (payload: Record<string, unknown>) =>
        this.fetch<ConverseApiResponse>({
          path: '/api/agent_builder/converse',
          method: 'POST',
          version: '2023-10-31',
          body: JSON.stringify(payload),
        });

      const resp = await post(body);

      // A user clicking "Run preview" / "Confirm" is the product flow, so the eval answers
      // `confirmation` prompts and scores what the agent says afterwards. All confirmations in
      // one response go into a single continuation POST; the loop repeats only for prompts the
      // continuation itself emits. Mirrors `autoConfirm` in `kbn-evals-suite-agent-builder`.
      let steps = resp.steps ?? [];
      let lastResponse = resp.response;
      let conversationId = resp.conversation_id;
      let pending = getConfirmationPrompts(lastResponse);
      let rounds = 0;

      while (Object.keys(pending).length > 0) {
        if (rounds >= MAX_AUTO_CONFIRM_ROUNDS) {
          throw new Error(
            `persona-matrix: exceeded ${MAX_AUTO_CONFIRM_ROUNDS} auto-confirm continuation rounds. ` +
              `Outstanding prompt ids: ${Object.keys(pending).join(', ')}. ` +
              `This indicates a stuck agent.`
          );
        }
        const continuation = await post({
          agent_id: agentBuilderDefaultAgentId,
          connector_id: this.connectorId,
          conversation_id: conversationId,
          prompts: pending,
          _execution_mode: 'local',
        });
        steps = [...steps, ...(continuation.steps ?? [])];
        lastResponse = continuation.response ?? lastResponse;
        conversationId = continuation.conversation_id ?? conversationId;
        rounds++;
        pending = getConfirmationPrompts(continuation.response);
      }

      // Whatever is still pending is a prompt the eval cannot answer (ask_user_question,
      // authorization). Do not let it score as an empty answer: record it as an
      // `unanswered_prompt` error and, when the round produced no text, put a marker in the
      // final message so the shared evaluators judge a visible non-answer instead of "".
      const errors: ConverseResponse['errors'] = [];
      const unanswered = (lastResponse?.prompts ?? []).filter((p) => p.type !== 'confirmation');
      for (const prompt of unanswered) {
        errors.push({
          type: 'unanswered_prompt',
          error: {
            message: `Agent paused on a ${prompt.type ?? 'unknown'} prompt: ${describePrompt(
              prompt
            )}`,
          },
        });
      }

      let message = lastResponse?.message ?? '';
      if (unanswered.length > 0 && !message.trim()) {
        message = `${UNANSWERED_PROMPT_MARKER} ${errors.map((e) => e.error.message).join('; ')}`;
      }

      const result: ConverseResponse = {
        messages: [{ message }],
        steps,
        errors,
        conversationId,
        traceId: resp.trace_id ?? null,
      };

      // Capture the verbatim answer when PERSONA_MATRIX_CAPTURE is set.
      const capturePath = process.env.PERSONA_MATRIX_CAPTURE;
      if (capturePath) {
        try {
          appendFileSync(
            capturePath,
            `${JSON.stringify({
              connector_id: this.connectorId,
              input,
              response_message: message,
              steps: result.steps,
              trace_id: result.traceId,
              conversation_id: result.conversationId,
              captured_at: new Date().toISOString(),
            })}\n`
          );
        } catch (err) {
          this.log.warning(`[persona-matrix] capture write failed: ${String(err)}`);
        }
      }

      return result;
    };

    return withRetry(call, {
      maxAttempts: 3,
      onRetry: ({ attempt, error }) => {
        this.log.warning(`[persona-matrix] converse retry (attempt ${attempt}): ${String(error)}`);
      },
    });
  }
}
