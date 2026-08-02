/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PndConversation } from '@kbn/pnd-common';

import type { ChatGroup } from '../nest_chat_groups';
import { uniqueConversations } from '../unique_conversations';

export interface ConversationsFromChatGroupsArgs {
  conversations: readonly PndConversation[];
  groups: readonly ChatGroup[];
}

/**
 * Conversations a set of chat groups actually shows: each parent plus nested
 * children looked up from the loaded list. Dedupes an investigation that is
 * both a group header and an incident child.
 */
export const conversationsFromChatGroups = ({
  conversations,
  groups,
}: ConversationsFromChatGroupsArgs): PndConversation[] => {
  const byId = new Map(conversations.map((conversation) => [conversation.id, conversation]));

  return uniqueConversations(
    groups.flatMap(({ children, parentConversation }) => [
      parentConversation,
      ...children.flatMap(({ id }) => {
        const child = byId.get(id);

        return child == null ? [] : [child];
      }),
    ])
  );
};
