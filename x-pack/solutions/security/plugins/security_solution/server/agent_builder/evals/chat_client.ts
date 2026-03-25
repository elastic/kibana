/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { HttpHandler } from '@kbn/core/public';
import pRetry from 'p-retry';

const RETRIES = 2;
const MIN_TIMEOUT = 2000;

export type Messages = { message: string }[];

export interface ErrorResponse {
  error: {
    message: string;
    stack?: string;
  };
  type: string;
}

export interface Step {
  [key: string]: unknown;
}

export interface ConverseParams {
  messages: Messages;
  conversationId?: string;
  agentId?: string;
}

interface ModelUsageStats {
  input_tokens?: number;
  output_tokens?: number;
  llm_calls?: number;
  model?: string;
  connector_id?: string;
}

export interface ConverseResponse {
  conversationId?: string;
  messages: Messages;
  errors: ErrorResponse[];
  steps?: Step[];
  traceId?: string;
  modelUsage?: ModelUsageStats;
}

export class AiSocEvalChatClient {
  constructor(
    private readonly fetch: HttpHandler,
    private readonly log: ToolingLog,
    private readonly connectorId: string
  ) {}

  async converse({ messages, conversationId, agentId }: ConverseParams): Promise<ConverseResponse> {
    const callConverseApi = async (): Promise<ConverseResponse> => {
      const response = await this.fetch('/api/agent_builder/converse', {
        method: 'POST',
        version: '2023-10-31',
        body: JSON.stringify({
          agent_id: agentId,
          connector_id: this.connectorId,
          conversation_id: conversationId,
          input: messages[messages.length - 1].message,
        }),
      });

      const chatResponse = response as {
        conversation_id: string;
        trace_id?: string;
        steps: Step[];
        response: { message: string };
        model_usage?: ModelUsageStats;
      };

      const {
        conversation_id: conversationIdFromResponse,
        response: latestResponse,
        steps,
        trace_id: traceId,
        model_usage: modelUsage,
      } = chatResponse;

      return {
        conversationId: conversationIdFromResponse,
        messages: [...messages, latestResponse],
        steps,
        traceId,
        modelUsage,
        errors: [],
      };
    };

    try {
      return await pRetry(callConverseApi, {
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
    } catch (error) {
      this.log.error('Error occurred while calling converse API');
      return {
        conversationId,
        steps: [],
        messages: [
          ...messages,
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
      };
    }
  }
}
