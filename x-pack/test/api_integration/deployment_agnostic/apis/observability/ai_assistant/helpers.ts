/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import {
  ConversationCreateEvent,
  ConversationUpdateEvent,
  StreamingChatResponseEvent,
  StreamingChatResponseEventType,
} from '@kbn/observability-ai-assistant-plugin/common/conversation_complete';

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
