/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import type { ChatMessage } from '@kbn/elastic-assistant-common/impl/schemas/chat/post_chat_complete_route.gen';
import {
  API_VERSIONS,
  ELASTIC_AI_ASSISTANT_CHAT_COMPLETE_URL,
} from '@kbn/elastic-assistant-common';

/**
 * Response from the chat complete API
 */
interface ChatCompleteResponse {
  response: string;
  isError: boolean;
  isStream: boolean;
  traceData?: {
    transactionId: string;
    traceId: string;
  };
}

function normalizeMessages(message: string | ChatMessage[]): ChatMessage[] {
  if (typeof message === 'string') {
    return [
      {
        content: message,
        role: 'user',
      },
    ];
  }
  return message;
}

export class SecurityAIAssistantEvaluationChatClient {
  constructor(
    private readonly fetch: HttpHandler,
    private readonly log: ToolingLog,
    private readonly connectorId: string
  ) {}

  async complete({
    messages: messagesArg,
  }: {
    messages: string | ChatMessage[];
  }): Promise<{ messages: ChatMessage[]; errors: unknown[] }> {
    this.log.info('Calling Security Assistant chat complete');

    const messages = normalizeMessages(messagesArg!);

    const response = await this.fetch<ChatCompleteResponse>(
      ELASTIC_AI_ASSISTANT_CHAT_COMPLETE_URL,
      {
        method: 'POST',
        version: API_VERSIONS.public.v1,
        body: JSON.stringify({
          connectorId: this.connectorId,
          persist: false,
          isStream: false,
          messages,
        }),
      }
    );

    // Map to common shape expected by evaluate_dataset
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: response.response,
    };

    return {
      messages: [...messages, assistantMessage],
      errors: response.isError ? [{ message: 'Chat error' }] : [],
    };
  }
}
