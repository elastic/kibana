/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ChatEvent,
  MessageEvent,
  ChunkEvent,
  ConversationCreatedEvent,
  ConversationUpdatedEvent,
} from '../chat_events';

export const conversationCreatedEvent = ({
  id,
  title,
}: {
  id: string;
  title: string;
}): ConversationCreatedEvent => {
  return {
    type: 'conversation_created',
    conversation: { id, title },
  };
};

export const conversationUpdatedEvent = ({
  id,
  title,
}: {
  id: string;
  title: string;
}): ConversationUpdatedEvent => {
  return {
    type: 'conversation_updated',
    conversation: { id, title },
  };
};

export const isMessageEvent = (event: ChatEvent): event is MessageEvent => {
  return event.type === 'message';
};

export const isChunkEvent = (event: ChatEvent): event is ChunkEvent => {
  return event.type === 'message_chunk';
};
