/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { Client } from '@elastic/elasticsearch';
import {
  ConversationCreateEvent,
  ConversationUpdateEvent,
  Message,
  MessageAddEvent,
  MessageRole,
  StreamingChatResponseEvent,
  StreamingChatResponseEventType,
  type ConversationCreateRequest,
} from '@kbn/observability-ai-assistant-plugin/common';
import { Readable } from 'stream';
import type { AssistantScope } from '@kbn/ai-assistant-common';
import { ObservabilityAIAssistantScreenContextRequest } from '@kbn/observability-ai-assistant-plugin/common/types';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import type { ObservabilityAIAssistantApiClient } from '../../../services/observability_ai_assistant_api';

export function decodeEvents(body: Readable | string) {
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
  screenContexts = [],
  connectorId,
  persist = false,
  observabilityAIAssistantAPIClient,
}: {
  userPrompt: string;
  screenContexts?: ObservabilityAIAssistantScreenContextRequest[];
  connectorId: string;
  persist?: boolean;
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
        persist,
        screenContexts,
        scopes: ['observability' as const],
      },
    },
  });

  expect(status).to.be(200);
  const messageEvents = decodeEvents(body);
  const messageAddedEvents = getMessageAddedEvents(body);
  const conversationCreateEvent = getConversationCreatedEvent(body);
  return { messageAddedEvents, conversationCreateEvent, messageEvents, status };
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

export async function clearConversations(es: Client) {
  const KB_INDEX = '.kibana-observability-ai-assistant-conversations-*';

  return es.deleteByQuery({
    index: KB_INDEX,
    conflicts: 'proceed',
    query: { match_all: {} },
    refresh: true,
  });
}

export function getConversationCreatedEvent(body: Readable | string) {
  const decodedEvents = decodeEvents(body);
  const conversationCreatedEvent = decodedEvents.find(
    (event) => event.type === StreamingChatResponseEventType.ConversationCreate
  ) as ConversationCreateEvent;

  return conversationCreatedEvent;
}

export function getConversationUpdatedEvent(body: Readable | string) {
  const decodedEvents = decodeEvents(body);
  const conversationUpdatedEvent = decodedEvents.find(
    (event) => event.type === StreamingChatResponseEventType.ConversationUpdate
  ) as ConversationUpdateEvent;

  if (!conversationUpdatedEvent) {
    throw new Error(
      `No conversation updated event found: ${JSON.stringify(decodedEvents, null, 2)}`
    );
  }

  return conversationUpdatedEvent;
}

export const conversationCreate: ConversationCreateRequest = {
  '@timestamp': new Date().toISOString(),
  conversation: {
    title: 'My title',
  },
  labels: {},
  numeric_labels: {},
  systemMessage: 'this is a system message',
  messages: [
    {
      '@timestamp': new Date().toISOString(),
      message: {
        role: MessageRole.User,
        content: 'My message',
      },
    },
  ],
  public: false,
  archived: false,
};

export async function createConversation({
  observabilityAIAssistantAPIClient,
  user = 'editor',
  isPublic = false,
}: {
  observabilityAIAssistantAPIClient: ObservabilityAIAssistantApiClient;
  user?: 'admin' | 'editor' | 'viewer';
  isPublic?: boolean;
}) {
  const response = await observabilityAIAssistantAPIClient[user]({
    endpoint: 'POST /internal/observability_ai_assistant/conversation',
    params: {
      body: {
        conversation: { ...conversationCreate, public: isPublic },
      },
    },
  });

  return response;
}
