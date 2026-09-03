/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { originatingInvestigation, parentOf, type PndConversation } from '@kbn/pnd-common';

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 10;

export interface PaginateConversationsArgs {
  conversations: readonly PndConversation[];
  kind?: PndConversation['kind'];
  page?: number;
  perPage?: number;
}

export interface PaginateConversationsResult {
  conversations: PndConversation[];
  total: number;
}

const compareForPage = (left: PndConversation, right: PndConversation): number => {
  const byUpdated = right.updatedAt.localeCompare(left.updatedAt);

  return byUpdated !== 0 ? byUpdated : left.id.localeCompare(right.id);
};

const slicePage = ({
  conversations,
  page,
  perPage,
}: {
  conversations: readonly PndConversation[];
  page: number;
  perPage: number;
}): PndConversation[] => {
  const start = (page - 1) * perPage;

  return conversations.slice(start, start + perPage);
};

const relatedForParents = ({
  conversations,
  kind,
  parents,
}: {
  conversations: readonly PndConversation[];
  kind: 'incident' | 'investigation';
  parents: readonly PndConversation[];
}): PndConversation[] => {
  const parentIds = new Set(parents.map(({ id }) => id));
  const parentAlertIds = new Set(parents.map(({ correlationId }) => correlationId));

  const threads = conversations.filter((conversation) => {
    if (conversation.kind !== 'thread') {
      return false;
    }

    const parentage = parentOf(conversation);

    return parentage != null && parentIds.has(parentage.parentConversationId);
  });

  if (kind === 'investigation') {
    return threads;
  }

  const tuning = conversations.filter(
    (conversation) =>
      conversation.kind === 'tuning' && parentAlertIds.has(conversation.correlationId)
  );

  const originating = parents.flatMap((incident) => {
    const origin = originatingInvestigation({ conversations, incident });

    return origin == null || parentIds.has(origin.id) ? [] : [origin];
  });

  return [...threads, ...tuning, ...originating];
};

/**
 * Filter, sort and page the derived conversation list.
 *
 * `total` is the count of the requested kind (or of every conversation when `kind`
 * is omitted). When `kind` is `incident` or `investigation`, nested children of
 * the returned parents are appended so the chat page can nest without a second
 * unbounded read — they do not count toward `total`.
 *
 * Omit both `page` and `perPage` to return the full matching set: lifecycle and
 * the queue still need the whole projection.
 */
export const paginateConversations = ({
  conversations,
  kind,
  page,
  perPage,
}: PaginateConversationsArgs): PaginateConversationsResult => {
  const matching =
    kind == null
      ? [...conversations]
      : conversations.filter((conversation) => conversation.kind === kind);
  const sorted = [...matching].sort(compareForPage);
  const total = sorted.length;
  const shouldPage = page != null || perPage != null;
  const parents = shouldPage
    ? slicePage({
        conversations: sorted,
        page: page ?? DEFAULT_PAGE,
        perPage: perPage ?? DEFAULT_PER_PAGE,
      })
    : sorted;

  if (kind !== 'incident' && kind !== 'investigation') {
    return { conversations: parents, total };
  }

  const parentIds = new Set(parents.map(({ id }) => id));
  const related = relatedForParents({ conversations, kind, parents }).filter(
    (conversation) => !parentIds.has(conversation.id)
  );

  return { conversations: [...parents, ...related], total };
};
