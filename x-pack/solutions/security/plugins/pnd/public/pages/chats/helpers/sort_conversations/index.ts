/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PndConversation } from '@kbn/pnd-common';

/**
 * Every sort the projection can honestly support, in the order the control
 * offers them. There is nothing else to sort by: the response projects six
 * fields, two of which are ids and one of which has its own filter.
 */
export const PND_CONVERSATION_SORTS = ['updatedAt', 'createdAt', 'title'] as const;

export type PndConversationSort = (typeof PND_CONVERSATION_SORTS)[number];

export interface SortConversationsParams {
  conversations: PndConversation[];
  sort: PndConversationSort;
}

/** `-Infinity` for a timestamp that will not parse, so a broken row sorts last rather than vanishing. */
const toTime = (value: string): number => {
  const parsed = Date.parse(value);

  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
};

/**
 * Explicit comparisons rather than subtraction: two unparseable timestamps would
 * make `-Infinity - -Infinity` a `NaN` comparator, which leaves the order
 * undefined.
 */
const compareTimestampsDescending = (left: string, right: string): number => {
  const leftTime = toTime(left);
  const rightTime = toTime(right);

  if (leftTime === rightTime) {
    return 0;
  }

  return rightTime > leftTime ? 1 : -1;
};

const compareTitles = (left: PndConversation, right: PndConversation): number =>
  left.title.localeCompare(right.title, undefined, { sensitivity: 'base' });

const COMPARATORS: Record<
  PndConversationSort,
  (left: PndConversation, right: PndConversation) => number
> = {
  createdAt: (left, right) => compareTimestampsDescending(left.createdAt, right.createdAt),
  title: compareTitles,
  updatedAt: (left, right) => compareTimestampsDescending(left.updatedAt, right.updatedAt),
};

/**
 * Orders the conversation list **client-side** — the route has no sort parameter.
 *
 * Both timestamp sorts are newest-first, because the question this view answers
 * during a run is "what just happened"; the title sort is ascending and
 * case-insensitive, so casing alone cannot split one Attack Discovery's rows.
 *
 * The title sort no longer groups by kind, and cannot: since kibana-phf4.16 the
 * three alert-keyed conversations are titled from the Attack Discovery title
 * alone, so the ones derived from a single discovery sort *together* rather than
 * into three prefixed blocks. Kind is a badge, read from the namespace. Anyone
 * wanting to group by kind needs a comparator on `kind`, not on `title`.
 *
 * Copies before sorting: `Array.prototype.sort` mutates, and the array here is
 * react-query's cached response.
 */
export const sortConversations = ({
  conversations,
  sort,
}: SortConversationsParams): PndConversation[] => [...conversations].sort(COMPARATORS[sort]);
