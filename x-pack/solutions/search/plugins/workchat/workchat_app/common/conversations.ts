/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Message } from './messages';

export interface Conversation {
  id: string;
  agentId: string;
  title: string;
  lastUpdated: string;
  user: {
    id: string;
    name: string;
  };
  events: ConversationEvent[];
}

interface EventBase<T extends string> {
  type: T;
  id: string;
  createdAt: string;
}

export interface ConversationMessageEvent extends EventBase<'message'> {
  message: Message;
}

// only one type of event for now
export type ConversationEvent = ConversationMessageEvent;

export type ConversationCreateRequest = Omit<Conversation, 'id' | 'lastUpdated' | 'user'>;
