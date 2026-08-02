/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PndConversation } from '@kbn/pnd-common';
import type { PndConversationKindName } from '../../../../components/conversation_kind_badge';

/** The "no kind filter" sentinel, so the control has a single value type. */
export const ALL_CONVERSATION_KINDS = 'all' as const;

export type PndConversationKindFilter = PndConversationKindName | typeof ALL_CONVERSATION_KINDS;

export interface FilterConversationsParams {
  conversations: PndConversation[];
  kind: PndConversationKindFilter;
  /** Free text; matched against the three strings a row actually shows. */
  query: string;
}

/**
 * The three fields an analyst can see on a row and paste from somewhere else: the
 * title, the attack discovery the conversation was derived from, and the
 * conversation id a server log hands them.
 */
const matchesQuery = (conversation: PndConversation, needle: string): boolean =>
  [conversation.title, conversation.correlationId, conversation.id].some((field) =>
    field.toLowerCase().includes(needle)
  );

/**
 * Narrows the conversation list by kind and free text, **client-side**.
 *
 * `GET /internal/pnd/conversations` takes no query parameters and does not
 * paginate — it is triple-capped upstream (1000 conversations intersected with
 * 1000 AD alerts) — so every list control here works on the response in memory.
 *
 * An unrecognized `kind` (one the browser is older than) survives the "all"
 * filter rather than disappearing: the row still renders, with the badge's
 * explicit "Unknown" fallback.
 */
export const filterConversations = ({
  conversations,
  kind,
  query,
}: FilterConversationsParams): PndConversation[] => {
  const needle = query.trim().toLowerCase();

  return conversations.filter(
    (conversation) =>
      (kind === ALL_CONVERSATION_KINDS || conversation.kind === kind) &&
      (needle.length === 0 || matchesQuery(conversation, needle))
  );
};
