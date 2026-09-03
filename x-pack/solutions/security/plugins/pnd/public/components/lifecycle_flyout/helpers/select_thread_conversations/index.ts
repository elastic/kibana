/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PndConversation } from '@kbn/pnd-common';

export interface SelectThreadConversationsParams {
  correlationId: string;
  /** Every PND conversation in the space, from `GET /internal/pnd/conversations`. */
  conversations: PndConversation[];
}

/**
 * The `[Thread]` conversations paired with one discovery's proposals — up to one per registered gate
 * (D1), and commonly none.
 *
 * Read out of the conversations **list** rather than derived, and that distinction is the point: a
 * derived thread id always answers, for a thread nothing has created. The list is the intersection of
 * the derived ids with the caller's own Agent Builder conversations, so a row appearing here is
 * proof the thread exists and this analyst can read it. Attachments are then a real request rather
 * than a guaranteed 404.
 *
 * Fail-closed on a blank discovery id: the proposals route uses `''` for a gate it could not
 * correlate, and matching on it would hang another discovery's threads off this lifecycle.
 *
 * Agent Builder's own ordering is preserved rather than sorted by gate, so a re-read cannot reshuffle
 * the tab under someone reading it.
 */
export const selectThreadConversations = ({
  correlationId,
  conversations,
}: SelectThreadConversationsParams): PndConversation[] =>
  correlationId === ''
    ? []
    : conversations.filter(
        (conversation) =>
          conversation.kind === 'thread' && conversation.correlationId === correlationId
      );
