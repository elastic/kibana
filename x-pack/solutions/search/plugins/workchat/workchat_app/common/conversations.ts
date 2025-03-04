/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Message } from './messages';

export interface Conversation {
  conversationId: string;
  agentId: string;
  title: string;
  lastUpdated: string;
  events: ConversationEvent[];
}

export enum ConversationEventType {
  message = 'message',
}

interface EventBase<T extends ConversationEventType> {
  type: T;
  id: string;
  createdAt: string;
}

export interface ConversationMessageEvent extends EventBase<ConversationEventType.message> {
  message: Message;
}

// only one type of event for now
export type ConversationEvent = ConversationMessageEvent;
