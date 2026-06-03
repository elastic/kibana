/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConversationChatMode,
  ConversationWithoutRounds,
} from '@kbn/agent-builder-common';

type CollaborativeConversationCandidate = Pick<
  ConversationWithoutRounds,
  'template_snapshot' | 'conversation_mode'
> & {
  chat_mode?: ConversationChatMode;
};

export const isCollaborativeInvestigation = (
  conversation: CollaborativeConversationCandidate
): boolean => {
  if (conversation.chat_mode === 'collaborative') {
    return true;
  }

  if (conversation.template_snapshot?.chat_mode === 'collaborative') {
    return true;
  }

  return conversation.conversation_mode === 'group';
};
