/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Message, UserMessage, AssistantMessage } from '../messages';

export const userMessage = (content: string): UserMessage => {
  return {
    type: 'user',
    content,
  };
};

export const assistantMessage = (content: string): AssistantMessage => {
  return {
    type: 'assistant',
    content,
  };
};

export const isUserMessage = (message: Message): message is UserMessage => {
  return message.type === 'user';
};

export const isAssistantMessage = (message: Message): message is AssistantMessage => {
  return message.type === 'assistant';
};
