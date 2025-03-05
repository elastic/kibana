/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ConversationMessageEvent, ConversationEvent } from '../conversations';
import type { Message } from '../messages';
import { userMessage } from './messages';

export const messageEvent = (
  message: Message,
  { id, createdAt }: { id?: string; createdAt?: string } = {}
): ConversationMessageEvent => {
  return {
    type: 'message',
    id: id ?? uuidv4(),
    createdAt: createdAt ?? new Date().toISOString(),
    message,
  };
};

export const userMessageEvent = (
  content: string,
  options: { id?: string; createdAt?: string } = {}
) => {
  return messageEvent(userMessage(content), options);
};

export const isMessageEvent = (event: ConversationEvent): event is ConversationMessageEvent => {
  return event.type === 'message';
};

export const getMessages = (events: ConversationEvent[]): Message[] => {
  return events.filter(isMessageEvent).map((event) => event.message);
};
