/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
// Evals run in Node; SHA-256 is needed for stable trajectory provenance.
import { createHash } from 'crypto';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { withRetry } from '@kbn/evals';

/** Maximum number of auto-confirm continuation calls per query. */
export const MAX_AUTO_CONFIRM_ROUNDS = 3;

/** Cap on the stored final converse response body, in characters. */
export const RAW_RESPONSE_MAX_CHARS = 20_000;

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
  /**
   * Where `messages[last].message` came from. 'last_assistant_step' means the
   * converse response carried no final message and the last non-empty
   * assistant reasoning/output step was used verbatim instead — surfaced so
   * reports can label the fallback instead of presenting it as a true answer.
   */
  messageSource: 'response' | 'last_assistant_step';
  /** Reproducibility metadata persisted in task.output on every score doc. */
  sampling: {
    connectorId: string;
    temperature: number | null;
    topP: number | null;
    seed: number | null;
  };
  /** sha256 of the ordered tool_id + params sequence (provider ids excluded). */
  trajectoryFingerprint: string;
  /**
   * Current-version YAML of each `workflow.yaml` conversation attachment.
   * In Agent Builder runs `generate_workflow` keeps the YAML in the attachment
   * and returns only its id, so this is the only place the authored workflow
   * is recoverable. Empty when the run authored no workflow attachment.
   */
  workflowAttachments: WorkflowAttachmentYaml[];
  /**
   * The final converse `response` body as JSON, capped at
   * `RAW_RESPONSE_MAX_CHARS`. Kept for post-hoc diagnosis of cells whose
   * `messages` were rewritten by the fallbacks above. Never given to the judges.
   */
  rawResponse: string;
}

const boundRawResponse = (response: unknown): string => {
  const serialized = JSON.stringify(response ?? null) ?? 'null';
  return serialized.length > RAW_RESPONSE_MAX_CHARS
    ? `${serialized.slice(0, RAW_RESPONSE_MAX_CHARS)}…[truncated ${
        serialized.length - RAW_RESPONSE_MAX_CHARS
      } chars]`
    : serialized;
};

export interface WorkflowAttachmentYaml {
  id: string;
  version: number;
  yaml: string;
}

const WORKFLOW_YAML_ATTACHMENT_TYPE = 'workflow.yaml';

const WORKFLOW_AUTHORING_TOOL_IDS = new Set([
  'platform.core.generate_workflow',
  'platform.workflows.validate_workflow',
]);

interface ConversationApiResponse {
  attachments?: Array<VersionedAttachment<string, { yaml?: unknown }>>;
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
    private readonly connectorId: string,
    private readonly agentId: string = agentBuilderDefaultAgentId
  ) {}

  async query(input: string, attachment?: string): Promise<ConverseResponse> {
    const call = async (): Promise<ConverseResponse> => {
      const body: Record<string, unknown> = {
        agent_id: this.agentId,
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

      let stuckAgentError: { message: string } | null = null;
      while (Object.keys(pending).length > 0) {
        if (rounds >= MAX_AUTO_CONFIRM_ROUNDS) {
          // Fail soft: the trajectory up to the loop is real agent behaviour the
          // deterministic evaluators can score; throwing here discards the whole
          // run, not just this example.
          stuckAgentError = {
            message:
              `persona-matrix: exceeded ${MAX_AUTO_CONFIRM_ROUNDS} auto-confirm continuation rounds. ` +
              `Outstanding prompt ids: ${Object.keys(pending).join(', ')}. ` +
              `This indicates a stuck agent.`,
          };
          break;
        }
        const continuation = await post({
          agent_id: this.agentId,
          connector_id: this.connectorId,
          conversation_id: conversationId,
          prompts: pending,
          _execution_mode: 'local',
        });
        // The converse response is the folded round, so a continuation already carries every step
        // of earlier executions; replace instead of appending or each round stacks a copy.
        steps = continuation.steps ?? steps;
        lastResponse = continuation.response ?? lastResponse;
        conversationId = continuation.conversation_id ?? conversationId;
        rounds++;
        pending = getConfirmationPrompts(continuation.response);
      }

      // Whatever is still pending is a prompt the eval cannot answer (ask_user_question,
      // authorization). Record it as an `unanswered_prompt` error so it never scores as a
      // silent empty answer.
      const errors: ConverseResponse['errors'] = (lastResponse?.prompts ?? [])
        .filter((prompt) => prompt.type !== 'confirmation')
        .map((prompt) => ({
          type: 'unanswered_prompt' as const,
          error: {
            message: `Agent paused on a ${prompt.type ?? 'unknown'} prompt: ${describePrompt(
              prompt
            )}`,
          },
        }));
      if (stuckAgentError) {
        errors.unshift({ type: 'error', error: stuckAgentError });
      }
      // Final-answer fallback: some models end on a tool call (no closing
      // assistant turn), so response.message is "". Downstream, a blank final
      // message renders "No final answer message captured" and the answer-
      // based LLM judges see an empty answer. Use the LAST non-empty assistant
      // reasoning/output step verbatim — never synthesized — and mark it as a
      // fallback so the trace card can label it honestly.
      let message = lastResponse?.message ?? '';
      let messageSource: 'response' | 'last_assistant_step' = 'response';
      if (!message.trim() && errors.length > 0) {
        // Paused with no text: the judges see a visible non-answer instead of "" or of
        // interior narration that reads like a closing answer.
        message = `${UNANSWERED_PROMPT_MARKER} ${errors.map((e) => e.error.message).join('; ')}`;
      } else if (!message.trim()) {
        const lastAssistant = [...steps].reverse().find((step) => {
          const text =
            step.type === 'reasoning' ? step.reasoning : step.type === 'output' ? step.output : '';
          return typeof text === 'string' && text.trim().length > 0;
        });
        if (lastAssistant) {
          const text =
            lastAssistant.type === 'reasoning' ? lastAssistant.reasoning : lastAssistant.output;
          message = typeof text === 'string' ? text : '';
          messageSource = message.trim() ? 'last_assistant_step' : 'response';
        }
      }
      const trajectoryFingerprint = createHash('sha256')
        .update(
          JSON.stringify(
            steps
              .filter((step) => step.type === 'tool_call' && step.tool_id)
              .map((step) => ({ tool_id: step.tool_id, params: step.params ?? null }))
          )
        )
        .digest('hex');

      const result: ConverseResponse = {
        messages: [{ message }],
        steps,
        errors,
        messageSource,
        conversationId,
        traceId: resp.trace_id ?? null,
        sampling: {
          connectorId: this.connectorId,
          // The converse API exposes no sampling controls. Persist null rather
          // than inventing provider defaults; absence is itself evidence.
          temperature: null,
          topP: null,
          seed: null,
        },
        trajectoryFingerprint,
        workflowAttachments: await this.fetchWorkflowAttachments(conversationId, steps),
        rawResponse: boundRawResponse(lastResponse),
      };

      return result;
    };

    return withRetry(call, {
      maxAttempts: 3,
      onRetry: ({ attempt, error }) => {
        this.log.warning(`[persona-matrix] converse retry (attempt ${attempt}): ${String(error)}`);
      },
    });
  }

  /**
   * Reads the workflow YAML back from the conversation. Only done when the run
   * called a workflow-authoring tool, so unrelated cells pay no extra request.
   * A failed read degrades to "no attachments" (the evaluator then scores what
   * it can see) rather than failing the converse call.
   */
  private async fetchWorkflowAttachments(
    conversationId: string | undefined,
    steps: ConverseStep[]
  ): Promise<WorkflowAttachmentYaml[]> {
    const authoredWorkflow = steps.some(
      (step) => step.type === 'tool_call' && WORKFLOW_AUTHORING_TOOL_IDS.has(step.tool_id ?? '')
    );
    if (!conversationId || !authoredWorkflow) {
      return [];
    }
    try {
      const conversation = await this.fetch<ConversationApiResponse>({
        path: `/api/agent_builder/conversations/${encodeURIComponent(conversationId)}`,
        method: 'GET',
        version: '2023-10-31',
      });
      return (conversation.attachments ?? []).flatMap((attachment) => {
        if (attachment.type !== WORKFLOW_YAML_ATTACHMENT_TYPE) {
          return [];
        }
        const current = attachment.versions.find(
          (candidate) => candidate.version === attachment.current_version
        );
        const yaml = current?.data.yaml;
        return current && typeof yaml === 'string'
          ? [{ id: attachment.id, version: current.version, yaml }]
          : [];
      });
    } catch (error) {
      this.log.warning(
        `[persona-matrix] could not read workflow attachments for ${conversationId}: ${String(
          error
        )}`
      );
      return [];
    }
  }
}
