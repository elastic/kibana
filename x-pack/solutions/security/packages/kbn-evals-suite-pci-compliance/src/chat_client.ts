/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { HttpHandler } from '@kbn/core/public';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import type { PromptRequest, PromptResponse } from '@kbn/agent-builder-common/agents';
import { isConfirmationPrompt } from '@kbn/agent-builder-common/agents';
import pRetry from 'p-retry';

const RETRIES = 2;
const MIN_TIMEOUT = 2000;

/**
 * Maximum number of prompt-answer turns the client takes inside one round. A prompt that keeps
 * coming back (or a long chain of confirmations) stops at this cap instead of looping forever;
 * the round is then reported as paused rather than as an answer.
 */
export const MAX_PROMPT_TURNS = 3;

/** Marker prefixing the answer of a round that ended on a prompt this client cannot answer. */
export const UNANSWERED_PROMPT_MARKER = '[UNANSWERED_PROMPT]';

export interface ConverseParams {
  message: string;
  conversationId?: string;
}

export interface ConverseResponse {
  conversationId?: string;
  messages: Array<{ message: string }>;
  steps?: unknown[];
  errors: unknown[];
  traceId?: string;
  /** Prompts the round was still waiting on when it ended (empty for a completed round). */
  prompts: PromptRequest[];
  /** How many times the client answered a pending prompt so the round could continue. */
  promptTurns: number;
  /** True when the round ended on a prompt the client could not answer. */
  unansweredPrompt: boolean;
}

interface ConverseApiResponse {
  conversation_id: string;
  trace_id?: string;
  round_id?: string;
  status?: string;
  steps: unknown[];
  response: { message: string; prompts?: PromptRequest[] };
}

/**
 * Builds the response map for the prompts the agent is waiting on. Only HITL confirmations are
 * answered, and always by allowing them — that is what a user clicking "Apply changes" does. An
 * `authorization` or `ask_user_question` prompt needs a real decision, so it stays pending and the
 * round is reported as paused instead of scored.
 *
 * Returns `null` when at least one prompt cannot be answered safely, or when a prompt was already
 * answered earlier in this round (answering it again would loop).
 */
export const buildPromptResponses = (
  prompts: PromptRequest[],
  alreadyAnswered: ReadonlySet<string> = new Set()
): Record<string, PromptResponse> | null => {
  const responses: Record<string, PromptResponse> = {};

  for (const prompt of prompts) {
    if (!isConfirmationPrompt(prompt)) {
      return null;
    }
    if (alreadyAnswered.has(prompt.id)) {
      return null;
    }
    responses[prompt.id] = { allow: true };
  }

  return Object.keys(responses).length > 0 ? responses : null;
};

/**
 * Thin wrapper around the Agent Builder `converse` endpoint. Mirrors the Endpoint suite
 * (see @kbn/evals-suite-endpoint) so PCI evals produce comparable traces and metrics.
 *
 * Unlike the Endpoint suite it also drives HITL pauses: when the agent stops on a tool
 * confirmation the client answers it and continues the same round, so a paused round is not
 * graded as if it were an answer.
 */
export class PciEvalChatClient {
  constructor(
    private readonly fetch: HttpHandler,
    private readonly log: ToolingLog,
    private readonly connectorId: string
  ) {}

  async converse({ message, conversationId }: ConverseParams): Promise<ConverseResponse> {
    // Read per-call so env-var overrides (e.g. AGENT_BUILDER_AGENT_ID) are honoured between tests.
    const agentId = process.env.AGENT_BUILDER_AGENT_ID ?? agentBuilderDefaultAgentId;

    this.log.info('Calling converse');

    const postConverse = async (params: {
      conversationId?: string;
      input?: string;
      prompts?: Record<string, PromptResponse>;
    }): Promise<ConverseApiResponse> => {
      const response = await this.fetch('/api/agent_builder/converse', {
        method: 'POST',
        version: '2023-10-31',
        body: JSON.stringify({
          agent_id: agentId,
          connector_id: this.connectorId,
          conversation_id: params.conversationId,
          input: params.input,
          prompts: params.prompts,
        }),
      });

      return response as ConverseApiResponse;
    };

    const callConverseApi = async (params: {
      conversationId?: string;
      input?: string;
      prompts?: Record<string, PromptResponse>;
    }): Promise<ConverseApiResponse> => {
      return pRetry(() => postConverse(params), {
        retries: RETRIES,
        minTimeout: MIN_TIMEOUT,
        onFailedAttempt: (error) => {
          const isLastAttempt = error.retriesLeft === 0;
          if (isLastAttempt) {
            this.log.error(
              new Error(`Failed to call converse API after ${error.attemptNumber} attempts`, {
                cause: error,
              })
            );
          } else {
            this.log.warning(
              new Error(`Converse API call failed on attempt ${error.attemptNumber}; retrying...`, {
                cause: error,
              })
            );
          }
        },
      });
    };

    try {
      const firstResponse = await callConverseApi({ conversationId, input: message });

      const steps: unknown[] = [...(firstResponse.steps ?? [])];
      let answer = firstResponse.response?.message ?? '';
      let traceId = firstResponse.trace_id;
      // The first response opens (or echoes) the conversation; every pause turn stays inside it.
      const roundConversationId = firstResponse.conversation_id ?? conversationId;

      let pendingPrompts = firstResponse.response?.prompts ?? [];
      const answeredPromptIds = new Set<string>();
      let promptTurns = 0;

      while (pendingPrompts.length > 0 && promptTurns < MAX_PROMPT_TURNS) {
        const promptResponses = buildPromptResponses(pendingPrompts, answeredPromptIds);
        if (!promptResponses) {
          break;
        }

        const answeredIds = pendingPrompts.map((prompt) => prompt.id);
        answeredIds.forEach((promptId) => answeredPromptIds.add(promptId));
        promptTurns += 1;
        this.log.info(
          `Agent paused on ${answeredIds.join(', ')}; answering with ${JSON.stringify(
            promptResponses
          )} (prompt turn ${promptTurns}/${MAX_PROMPT_TURNS})`
        );

        // Resuming a paused round: the prompt responses are the input, the message is not repeated.
        const nextResponse = await callConverseApi({
          conversationId: roundConversationId,
          prompts: promptResponses,
        });

        steps.push(...(nextResponse.steps ?? []));
        answer = nextResponse.response?.message ?? '';
        traceId = nextResponse.trace_id ?? traceId;
        pendingPrompts = nextResponse.response?.prompts ?? [];
      }

      const unansweredPrompt = pendingPrompts.length > 0;
      if (unansweredPrompt) {
        const pendingIds = pendingPrompts.map((prompt) => prompt.id).join(', ');
        this.log.warning(
          `Round ended on an unanswered prompt (${pendingIds}) after ${promptTurns} prompt turn(s); ` +
            `reporting it as ${UNANSWERED_PROMPT_MARKER}`
        );
        answer =
          `${UNANSWERED_PROMPT_MARKER} the agent paused on ` +
          `${pendingPrompts.map((prompt) => prompt.type).join(', ')} prompt(s) (${pendingIds}) ` +
          'and never produced a user-facing answer. This round measures the eval client, not the ' +
          'model, and must not be scored.';
      }

      return {
        conversationId: roundConversationId,
        messages: [{ message }, { message: answer }],
        steps,
        errors: [],
        traceId,
        prompts: pendingPrompts,
        promptTurns,
        unansweredPrompt,
      };
    } catch (error) {
      this.log.error('Error occurred while calling converse API');
      return {
        conversationId,
        steps: [],
        messages: [
          { message },
          {
            message:
              'This question could not be answered as an internal error occurred. Please try again.',
          },
        ],
        errors: [
          {
            error: {
              message: error instanceof Error ? error.message : 'Unknown error',
              stack: error instanceof Error ? error.stack : undefined,
            },
            type: 'error',
          },
        ],
        prompts: [],
        promptTurns: 0,
        unansweredPrompt: false,
      };
    }
  }
}
