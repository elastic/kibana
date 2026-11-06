/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CortexRoundKind } from '../../common/cortex';
import { ALERT_RECOVERED_MESSAGE_PREFIX } from '../client/build_investigation_message';
import { FOLLOW_UP_PREAMBLE } from '../client/investigation_subjects';

/**
 * Tells the optimizer what kind of round it is learning from. The post-round hook carries no
 * follow-up context, so the alert-recovered follow-up is recognised by the sentence Nightshift opens
 * it with, and any other later round in the conversation is a follow-up.
 */
export const classifyCortexRound = ({
  userMessage,
  roundIndex,
}: {
  userMessage: string;
  /** Zero-based position of the round in its conversation, when known. */
  roundIndex?: number;
}): CortexRoundKind => {
  if (userMessage.trimStart().startsWith(ALERT_RECOVERED_MESSAGE_PREFIX)) {
    return 'alert_recovery';
  }
  return roundIndex !== undefined && roundIndex > 0 ? 'follow_up' : 'initial';
};

/** Rounds with fewer tool calls rarely establish anything durable, e.g. chat replies or smoke tests. */
export const MIN_OPTIMIZE_TOOL_CALLS = 3;

/** A follow-up with no tool calls still teaches something only when it says more than "thanks". */
export const MIN_FOLLOW_UP_MESSAGE_CHARS = 40;

/**
 * What the user wrote in a round. Nightshift wraps a follow-up it starts in a fixed preamble and
 * the workflow appends the round's context and operator guidance, so the stored message is far
 * longer than a bare "thanks".
 */
export const extractUserText = (message: string): string => {
  const trimmed = message.trim();
  const withoutPreamble = trimmed.startsWith(FOLLOW_UP_PREAMBLE)
    ? trimmed.slice(FOLLOW_UP_PREAMBLE.length)
    : trimmed;
  return withoutPreamble.replace(/\n+Additional (?:context|Instructions):[\s\S]*$/i, '').trim();
};

/**
 * Whether a round is worth an optimizer model call. An initial round needs real work behind it. A
 * follow-up may be a short correction, but a pleasantry with no tool calls has nothing to learn from.
 * A recovery round always runs, since it settles whether an earlier investigation was right.
 */
export const shouldOptimizeRound = ({
  roundKind,
  sandboxToolCallCount,
  userMessage,
}: {
  roundKind: CortexRoundKind;
  sandboxToolCallCount: number;
  userMessage: string;
}): boolean => {
  switch (roundKind) {
    case 'alert_recovery':
      return true;
    case 'follow_up':
      return (
        sandboxToolCallCount > 0 ||
        extractUserText(userMessage).length >= MIN_FOLLOW_UP_MESSAGE_CHARS
      );
    case 'initial':
      return sandboxToolCallCount >= MIN_OPTIMIZE_TOOL_CALLS;
  }
};
