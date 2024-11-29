/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import { ToolingLog } from '@kbn/tooling-log';
import {
  ConversationCreateEvent,
  ConversationUpdateEvent,
  StreamingChatResponseEvent,
  StreamingChatResponseEventType,
} from '@kbn/observability-ai-assistant-plugin/common/conversation_complete';
import { ObservabilityAIAssistantApiClient } from '../../common/observability_ai_assistant_api_client';
import type { InternalRequestHeader, RoleCredentials } from '../../../../../../shared/services';

export function decodeEvents(body: Readable | string) {
  return String(body)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as StreamingChatResponseEvent);
}

export function getConversationCreatedEvent(body: Readable | string) {
  const decodedEvents = decodeEvents(body);
  const conversationCreatedEvent = decodedEvents.find(
    (event) => event.type === StreamingChatResponseEventType.ConversationCreate
  ) as ConversationCreateEvent;

  if (!conversationCreatedEvent) {
    throw new Error(
      `No conversation created event found: ${JSON.stringify(decodedEvents, null, 2)}`
    );
  }

  return conversationCreatedEvent;
}

export function getConversationUpdatedEvent(body: Readable | string) {
  const decodedEvents = decodeEvents(body);
  const conversationUpdatedEvent = decodedEvents.find(
    (event) => event.type === StreamingChatResponseEventType.ConversationUpdate
  ) as ConversationUpdateEvent;

  if (!conversationUpdatedEvent) {
    throw new Error(
      `No conversation created event found: ${JSON.stringify(decodedEvents, null, 2)}`
    );
  }

  return conversationUpdatedEvent;
}

export async function deleteAllConversations({
  observabilityAIAssistantAPIClient,
  internalReqHeader,
  roleAuthc,
  log,
}: {
  observabilityAIAssistantAPIClient: ObservabilityAIAssistantApiClient;
  internalReqHeader: InternalRequestHeader;
  roleAuthc: RoleCredentials;
  log: ToolingLog;
}) {
  const findConversationsResponse = await observabilityAIAssistantAPIClient
    .slsUser({
      endpoint: 'POST /internal/observability_ai_assistant/conversations',
      internalReqHeader,
      roleAuthc,
      params: {
        body: {
          query: '',
        },
      },
    })
    .expect(200);
  const conversations = findConversationsResponse.body.conversations;

  if (!conversations || conversations.length === 0) {
    return;
  }

  await Promise.all(
    conversations.map(async (conversation) => {
      try {
        await observabilityAIAssistantAPIClient
          .slsUser({
            endpoint: 'DELETE /internal/observability_ai_assistant/conversation/{conversationId}',
            internalReqHeader,
            roleAuthc,
            params: {
              path: {
                conversationId: conversation.conversation.id,
              },
            },
          })
          .expect(200);
      } catch (error) {
        log.error(`Failed to delete conversation with ID: ${conversation.conversation.id}`);
      }
    })
  );
}
