/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PndConversation } from '@kbn/pnd-common';
import { isPndConversationKindName } from '../../../../components/conversation_kind_badge';
import type { PndConversationKindName } from '../../../../components/conversation_kind_badge';

/**
 * Every kind starts at zero, so a category the run has not reached still renders a
 * tile reading `0` rather than disappearing — "no sub-investigation yet" and
 * "sub-investigations are not a thing" must not look the same. `thread` is
 * counted the same way, and a `0` there is the ordinary state of a space where no
 * HITL gate has parked yet.
 *
 * Spelled out rather than derived from `PND_CONVERSATION_KINDS` on purpose: the
 * `Record` requires every member, so adding a kind the badge presents fails the
 * type check here instead of silently dropping it from the counts.
 *
 * Keyed on the kinds the badge presents rather than on the contract's wider
 * `PndConversation['kind']` union, so a kind the contract gains before this browser
 * does is treated as unrecognized: on no tile, but still in the list and still in
 * the total, which is `conversations.length`.
 */
const emptyCounts = (): Record<PndConversationKindName, number> => ({
  incident: 0,
  investigation: 0,
  thread: 0,
  tuning: 0,
});

/**
 * Counts the conversations of each kind, for the chats KPI tiles.
 *
 * A kind the browser does not recognize is counted by none of the tiles — there
 * is no tile to put it on — but it is still in the list and still in the total,
 * which is `conversations.length`.
 */
export const countConversationsByKind = (
  conversations: PndConversation[]
): Record<PndConversationKindName, number> =>
  conversations.reduce<Record<PndConversationKindName, number>>(
    (counts, { kind }) =>
      isPndConversationKindName(kind) ? { ...counts, [kind]: counts[kind] + 1 } : counts,
    emptyCounts()
  );
