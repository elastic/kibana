/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Message } from './messages';

export interface ChatEventBase {
  type: string;
}

/**
 * Emitted when a message chunk is emitted by the LLM.
 */
export interface ChunkEvent extends ChatEventBase {
  type: 'message_chunk';
  text_chunk: string;
}

/**
 * Emitted when a conversation was created.
 *
 * Can be used to update the UI with the new information.
 */
export interface ConversationCreatedEvent extends ChatEventBase {
  type: 'conversation_created';
  conversation: ConversationEventChanges;
}

/**
 * Emitted when a conversation was updated.
 *
 * Can be used to update the UI with the new information.
 */
export interface ConversationUpdatedEvent extends ChatEventBase {
  type: 'conversation_updated';
  conversation: ConversationEventChanges;
}

export interface MessageEvent extends ChatEventBase {
  type: 'message';
  message: Message;
}

export interface ConversationEventChanges {
  id: string;
  title: string;
}

export type ChatEvent =
  | ChunkEvent
  | MessageEvent
  | ConversationCreatedEvent
  | ConversationUpdatedEvent;
