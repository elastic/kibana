/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WikiRoundKind } from '../../common/wiki';

/**
 * Tells the optimizer what kind of round it is learning from: the first round of a conversation is
 * an initial investigation, and any later round is a follow-up, whoever started it.
 */
export const classifyWikiRound = ({
  roundIndex,
}: {
  /** Zero-based position of the round in its conversation, when known. */
  roundIndex?: number;
}): WikiRoundKind => (roundIndex !== undefined && roundIndex > 0 ? 'follow_up' : 'initial');

/** Rounds with fewer tool calls rarely establish anything durable, e.g. chat replies or smoke tests. */
export const MIN_OPTIMIZE_TOOL_CALLS = 3;

/** A follow-up is worth learning from once the investigator checked something for it. */
export const MIN_FOLLOW_UP_TOOL_CALLS = 1;

/**
 * Whether a round is worth an optimizer model call. An initial round needs real work behind it. A
 * follow-up needs at least one tool call, so a pleasantry or a message nobody checked teaches
 * nothing.
 */
export const shouldOptimizeRound = ({
  roundKind,
  sandboxToolCallCount,
}: {
  roundKind: WikiRoundKind;
  sandboxToolCallCount: number;
}): boolean =>
  sandboxToolCallCount >=
  (roundKind === 'follow_up' ? MIN_FOLLOW_UP_TOOL_CALLS : MIN_OPTIMIZE_TOOL_CALLS);
