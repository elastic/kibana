/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import {
  Message,
  MessageAddEvent,
  MessageRole,
  StreamingChatResponseEvent,
} from '@kbn/observability-ai-assistant-plugin/common';
import { Readable } from 'stream';
import type { AssistantScope } from '@kbn/ai-assistant-common';
import { DeploymentAgnosticFtrProviderContext } from '../../../../../ftr_provider_context';
import type { ObservabilityAIAssistantApiClient } from '../../../../../services/observability_ai_assistant_api';

function decodeEvents(body: Readable | string) {
  return String(body)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as StreamingChatResponseEvent);
}

export function getMessageAddedEvents(body: Readable | string) {
  return decodeEvents(body).filter(
    (event): event is MessageAddEvent => event.type === 'messageAdd'
  );
}

export async function invokeChatCompleteWithFunctionRequest({
  connectorId,
  observabilityAIAssistantAPIClient,
  functionCall,
  scopes,
}: {
  connectorId: string;
  observabilityAIAssistantAPIClient: ObservabilityAIAssistantApiClient;
  functionCall: Message['message']['function_call'];
  scopes?: AssistantScope[];
}) {
  const { status, body } = await observabilityAIAssistantAPIClient.editor({
    endpoint: 'POST /internal/observability_ai_assistant/chat/complete',
    params: {
      body: {
        messages: [
          {
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.User,
              content: 'Hello from user',
            },
          },
          {
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.Assistant,
              content: '',
              function_call: functionCall,
            },
          },
        ],
        connectorId,
        persist: false,
        screenContexts: [],
        scopes: scopes || ['observability' as AssistantScope],
      },
    },
  });

  expect(status).to.be(200);

  return body;
}

export async function chatComplete({
  userPrompt,
  connectorId,
  observabilityAIAssistantAPIClient,
}: {
  userPrompt: string;
  connectorId: string;
  observabilityAIAssistantAPIClient: ObservabilityAIAssistantApiClient;
}) {
  const { status, body } = await observabilityAIAssistantAPIClient.editor({
    endpoint: 'POST /internal/observability_ai_assistant/chat/complete',
    params: {
      body: {
        messages: [
          {
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.User,
              content: userPrompt,
            },
          },
        ],
        connectorId,
        persist: false,
        screenContexts: [],
        scopes: ['observability' as const],
      },
    },
  });

  expect(status).to.be(200);
  const messageAddedEvents = getMessageAddedEvents(body);

  return { messageAddedEvents, body, status };
}

// order of instructions can vary, so we sort to compare them
export function systemMessageSorted(message: string) {
  return message
    .split('\n\n')
    .map((line) => line.trim())
    .sort();
}

export async function getSystemMessage(
  getService: DeploymentAgnosticFtrProviderContext['getService']
) {
  const apiClient = getService('observabilityAIAssistantApi');

  const { body } = await apiClient.editor({
    endpoint: 'GET /internal/observability_ai_assistant/functions',
    params: {
      query: {
        scopes: ['observability'],
      },
    },
  });

  return body.systemMessage;
}
