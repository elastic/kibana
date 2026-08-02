/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationWithoutRounds } from '@kbn/agent-builder-common';
import type { PndProposalRow } from '@kbn/pnd-common';

/**
 * Upper bound on `threadTitle`, matching the bound `PndProposalRow.threadTitle` and
 * `PndConversation.title` share. A longer title is truncated rather than propagated, because
 * `ListProposalsResponse.parse` would otherwise reject the whole queue over one long thread name.
 */
export const PND_THREAD_TITLE_MAX_LENGTH = 1024;

export interface ResolveThreadTitlesParams {
  /**
   * The caller's Agent Builder conversations, already access-filtered per user. Only the ones whose
   * id a row already derived are read, so a non-PND conversation can never contribute a title.
   */
  conversations: ConversationWithoutRounds[];
  /** Proposal rows carrying the `threadConversationId` to join on. */
  rows: PndProposalRow[];
}

/**
 * Join each row's `[Thread]` conversation title onto the row (D9), so the queue's rows render their
 * own title rather than making every client repeat the join.
 *
 * The join is a single pass over `conversations` into a map plus a single pass over `rows`: the
 * caller reads the conversation list once per request, never once per row.
 *
 * `threadTitle` is left **absent** — never blank — for a row whose thread has not materialised, for
 * an uncorrelated row (which carries no `threadConversationId` at all), and for a thread whose title
 * is blank. That is what lets a surface tell "no thread title" from "a thread titled empty string"
 * and fall back to the gate prompt `title`, which is exactly what D9 asks of it.
 */
export const resolveThreadTitles = ({
  conversations,
  rows,
}: ResolveThreadTitlesParams): PndProposalRow[] => {
  const titleById = new Map(conversations.map(({ id, title }) => [id, title] as const));

  return rows.map((row) => {
    const { threadConversationId } = row;
    const title = threadConversationId == null ? undefined : titleById.get(threadConversationId);

    if (title == null || title.trim() === '') {
      return row;
    }

    return { ...row, threadTitle: title.slice(0, PND_THREAD_TITLE_MAX_LENGTH) };
  });
};
