/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import pRetry from 'p-retry';

interface ConverseStep {
  type?: string;
  tool_id?: string;
  results?: unknown[];
  [k: string]: unknown;
}

export interface ConverseResponse {
  conversationId?: string;
  messages: Array<{ message: string }>;
  steps: ConverseStep[];
  errors: Array<{ error: { message: string; stack?: string }; type: 'error' }>;
  traceId?: string;
}

interface ConverseParams {
  message: string;
  conversationId?: string;
  agentId?: string;
}

/**
 * Agent Builder converse client with multi-turn support for chained SOC scenarios.
 */
export class MultiStepAgentBuilderChatClient {
  constructor(
    private readonly fetch: HttpHandler,
    private readonly log: ToolingLog,
    private readonly connectorId: string
  ) {}

  async converse({
    message,
    conversationId,
    agentId = agentBuilderDefaultAgentId,
  }: ConverseParams): Promise<ConverseResponse> {
    const call = async (): Promise<ConverseResponse> => {
      const response = (await this.fetch('/api/agent_builder/converse', {
        method: 'POST',
        version: '2023-10-31',
        body: JSON.stringify({
          agent_id: agentId,
          connector_id: this.connectorId,
          conversation_id: conversationId,
          input: message,
        }),
      })) as {
        conversation_id?: string;
        trace_id?: string;
        steps?: ConverseStep[];
        response: { message: string };
      };

      return {
        conversationId: response.conversation_id,
        messages: [{ message: response.response.message }],
        steps: response.steps ?? [],
        traceId: response.trace_id,
        errors: [],
      };
    };

    try {
      return await pRetry(call, {
        retries: 2,
        minTimeout: 2_000,
        onFailedAttempt: (error) => {
          this.log.warning(
            new Error(
              `agent_builder/converse failed on attempt ${error.attemptNumber}; retrying...`,
              { cause: error }
            )
          );
        },
      });
    } catch (error) {
      this.log.error(
        new Error('agent_builder/converse failed after retries', {
          cause: error instanceof Error ? error : new Error(String(error)),
        })
      );
      return {
        conversationId,
        messages: [
          {
            message:
              'This question could not be answered as an internal error occurred. Please try again.',
          },
        ],
        steps: [],
        errors: [
          {
            error: {
              message: error instanceof Error ? error.message : 'Unknown error',
              stack: error instanceof Error ? error.stack : undefined,
            },
            type: 'error',
          },
        ],
      };
    }
  }

  async converseMultiTurn(turns: string[]): Promise<ConverseResponse> {
    let conversationId: string | undefined;
    const messages: Array<{ message: string }> = [];
    const steps: ConverseStep[] = [];
    const errors: ConverseResponse['errors'] = [];
    let traceId: string | undefined;

    for (const [index, turn] of turns.entries()) {
      this.log.info(`[multi-step] turn ${index + 1}/${turns.length}`);
      const response = await this.converse({ message: turn, conversationId });
      conversationId = response.conversationId ?? conversationId;
      messages.push(...response.messages);
      steps.push(...response.steps);
      errors.push(...response.errors);
      traceId = response.traceId ?? traceId;
    }

    return { conversationId, messages, steps, errors, traceId };
  }
}
