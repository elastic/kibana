/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AssistantMessage, UserMessage, ToolCall } from '../../../common/conversation_events';

interface ConversationItemBase {
  id: string;
  loading: boolean;
}

export type UserMessageConversationItem = ConversationItemBase & {
  type: 'user_message';
  message: UserMessage;
};

export type AssistantMessageConversationItem = ConversationItemBase & {
  type: 'assistant_message';
  message: AssistantMessage;
};

export type ToolCallConversationItem = ConversationItemBase & {
  type: 'tool_call';
  messageId: string;
  toolCall: ToolCall;
  toolResult?: string;
};

/**
 * UI-specific representation of the conversation events.
 */
export type ConversationItem =
  | UserMessageConversationItem
  | AssistantMessageConversationItem
  | ToolCallConversationItem;

export const isUserMessageItem = (item: ConversationItem): item is UserMessageConversationItem => {
  return item.type === 'user_message';
};

export const isAssistantMessageItem = (
  item: ConversationItem
): item is AssistantMessageConversationItem => {
  return item.type === 'assistant_message';
};

export const isToolCallItem = (item: ConversationItem): item is ToolCallConversationItem => {
  return item.type === 'tool_call';
};

export const createUserMessageItem = ({
  message,
  loading = false,
}: {
  message: UserMessage;
  loading?: boolean;
}): UserMessageConversationItem => {
  return {
    id: message.id,
    type: 'user_message',
    message,
    loading,
  };
};

export const createAssistantMessageItem = ({
  message,
  loading = false,
}: {
  message: AssistantMessage;
  loading?: boolean;
}): AssistantMessageConversationItem => {
  return {
    id: message.id,
    type: 'assistant_message',
    message,
    loading,
  };
};

export const createToolCallItem = ({
  messageId,
  toolCall,
  loading = false,
}: {
  messageId: string;
  toolCall: ToolCall;
  loading?: boolean;
}): ToolCallConversationItem => {
  return {
    id: toolCall.toolCallId,
    type: 'tool_call',
    messageId,
    toolCall,
    loading,
  };
};
