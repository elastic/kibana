/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { HttpHandler } from '@kbn/core/public';
import pRetry from 'p-retry';

type Messages = { message: string }[];

interface ConverseFunctionParams {
  messages: Messages;
  conversationId?: string;
}

export interface ModelUsageStats {
  input_tokens?: number;
  output_tokens?: number;
  llm_calls?: number;
  model?: string;
  connector_id?: string;
}

export interface ConverseResult {
  conversationId?: string;
  messages: Messages;
  errors: Array<{ error: { message: string; stack?: string }; type: string }>;
  steps?: Array<Record<string, unknown>>;
  traceId?: string;
  modelUsage?: ModelUsageStats;
}

type ConverseFunction = (params: ConverseFunctionParams) => Promise<ConverseResult>;

export class EvaluationChatClient {
  constructor(
    private readonly fetch: HttpHandler,
    private readonly log: ToolingLog,
    private readonly connectorId: string
  ) {}

  converse: ConverseFunction = async ({ messages, conversationId }) => {
    this.log.info('Calling converse');

    const callConverseApi = async (): Promise<ConverseResult> => {
      const response = await this.fetch('/api/agent_builder/converse', {
        method: 'POST',
        version: '2023-10-31',
        body: JSON.stringify({
          connector_id: this.connectorId,
          conversation_id: conversationId,
          input: messages[messages.length - 1].message,
        }),
      });

      const chatResponse = response as {
        conversation_id: string;
        trace_id?: string;
        steps: Array<Record<string, unknown>>;
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
        retries: 2,
        minTimeout: 2000,
        onFailedAttempt: (error) => {
          const isLastAttempt = error.attemptNumber === error.retriesLeft + error.attemptNumber;

          if (isLastAttempt) {
            this.log.error(
              new Error(`Failed to call converse API after ${error.attemptNumber} attempts`, {
                cause: error,
              })
            );
            throw error;
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
  };
}
