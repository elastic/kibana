/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AuthenticatedUser } from '@kbn/core/public';
import {
  type ConversationItem,
  isUserMessageItem,
  isAssistantMessageItem,
  isToolCallItem,
} from '../utils/conversation_items';
import { ChatConversationMessage } from './chat_conversation_message';
import { ChatConversationToolCall } from './chat_conversation_tool_call';

interface ChatConversationItemProps {
  item: ConversationItem;
  currentUser: AuthenticatedUser | undefined;
}

export const ChatConversationItem: React.FC<ChatConversationItemProps> = ({
  item,
  currentUser,
}) => {
  if (isUserMessageItem(item) || isAssistantMessageItem(item)) {
    return <ChatConversationMessage message={item} currentUser={currentUser} />;
  }
  if (isToolCallItem(item)) {
    return <ChatConversationToolCall toolCall={item} />;
  }
  return undefined;
};
