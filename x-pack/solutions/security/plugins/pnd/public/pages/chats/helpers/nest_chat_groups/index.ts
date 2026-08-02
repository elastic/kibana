/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  originatingInvestigation,
  parentOf,
  type PndConversation,
  type PndProposalRow,
} from '@kbn/pnd-common';

import type { QueueEvent, QueueParent } from '../../../../components/queue';
import { queueEventFromConversation } from '../queue_event_from_conversation';

export interface ChatGroup {
  children: QueueEvent[];
  parent: QueueParent;
  parentConversation: PndConversation;
}

export interface NestChatGroupsArgs {
  conversations: readonly PndConversation[];
  kind: 'incident' | 'investigation';
  proposals?: readonly PndProposalRow[];
}

const queueParentFromConversation = (conversation: PndConversation): QueueParent => ({
  id: conversation.id,
  summary: conversation.correlationId,
  title: conversation.title,
});

const childrenOf = ({
  conversations,
  parent,
}: {
  conversations: readonly PndConversation[];
  parent: PndConversation;
}): PndConversation[] => {
  const threads = conversations.filter((conversation) => {
    if (conversation.kind !== 'thread') {
      return false;
    }

    return parentOf(conversation)?.parentConversationId === parent.id;
  });

  if (parent.kind !== 'incident') {
    return threads;
  }

  const tuning = conversations.filter(
    (conversation) =>
      conversation.kind === 'tuning' && conversation.correlationId === parent.correlationId
  );
  const origin = originatingInvestigation({ conversations, incident: parent });
  const originating = origin == null || origin.id === parent.id ? [] : [origin];

  return [...threads, ...tuning, ...originating];
};

/**
 * Fold a paged conversations response into {@link ChatGroup}s. Group headers are
 * the requested kind; children nest by `parentOf` (threads), by alert id (tuning
 * under its incident), and by traversing `promotedFrom` (originating investigation).
 * Orphan threads are not group headers and are not rendered.
 */
export const nestChatGroups = ({
  conversations,
  kind,
  proposals = [],
}: NestChatGroupsArgs): ChatGroup[] =>
  conversations
    .filter((conversation) => conversation.kind === kind)
    .map((parentConversation) => ({
      children: childrenOf({ conversations, parent: parentConversation }).map((conversation) =>
        queueEventFromConversation({ conversation, proposals })
      ),
      parent: queueParentFromConversation(parentConversation),
      parentConversation,
    }));
