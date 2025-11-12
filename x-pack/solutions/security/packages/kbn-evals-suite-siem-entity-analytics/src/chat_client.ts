/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { HttpHandler } from '@kbn/core/public';
import pRetry from 'p-retry';

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

interface Options {
  agentId?: string;
}

interface ConverseFunctionParams {
  messages: Messages;
  conversationId?: string;
  options?: Options;
}

type ConverseFunction = (params: ConverseFunctionParams) => Promise<{
  conversationId?: string;
  messages: Messages;
  errors: ErrorResponse[];
  steps?: Step[];
}>;

export class SiemEntityAnalyticsEvaluationChatClient {
  constructor(
    private readonly fetch: HttpHandler,
    private readonly log: ToolingLog,
    private readonly connectorId: string
  ) {}

  converse: ConverseFunction = async ({ messages, conversationId, options = {} }) => {
    this.log.info('Calling converse for siem-entity-analytics agent');

    const { agentId = 'siem-entity-analytics' } = options;

    const callConverseApi = async (): Promise<{
      conversationId?: string;
      messages: { message: string }[];
      errors: ErrorResponse[];
      steps?: Step[];
    }> => {
      // Use the Agent Builder API endpoint
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

      // Extract conversation ID and response from the API response
      const chatResponse = response as {
        conversation_id: string;
        trace_id?: string;
        steps: Step[];
        response: { message: string };
      };
      const {
        conversation_id: conversationIdFromResponse,
        response: latestResponse,
        steps,
      } = chatResponse;

      return {
        conversationId: conversationIdFromResponse,
        messages: [...messages, latestResponse],
        steps,
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
