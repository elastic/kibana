/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_RECOVERED_FOLLOW_UP } from '../client/investigations_client';

export type InvestigationRoundKind = 'initial' | 'follow_up' | 'alert_recovery';

export interface RoundResolution {
  roundKind: InvestigationRoundKind;
  roundId: string;
  /** Zero-based position of `roundId` in the conversation. */
  roundIndex: number;
}

/** The parts of an Agent Builder conversation this reads. */
export interface ResolvableConversation {
  rounds: ReadonlyArray<{ id: string; started_at: string }>;
}

/**
 * Classifies a round by its place in the conversation.
 *
 * - `roundId` (from the Agent Builder hook) names the round; it may not be saved yet.
 * - Without it, the latest round is the run's. `runStartedAt` tells whether the run created the
 *   conversation's first round.
 * - A round is an `alert_recovery` only when `followUp` is `alert_recovered`; the message text
 *   is never read.
 *
 * Returns `undefined` when there is no round.
 */
export const resolveRound = (
  { rounds }: ResolvableConversation,
  {
    roundId,
    runStartedAt,
    followUp,
  }: { roundId?: string; runStartedAt?: string; followUp?: string } = {}
): RoundResolution | undefined => {
  const recovery = followUp === ALERT_RECOVERED_FOLLOW_UP;

  if (roundId !== undefined) {
    const index = rounds.findIndex(({ id }) => id === roundId);
    // Not saved yet, so every saved round is earlier.
    const roundIndex = index === -1 ? rounds.length : index;
    return {
      roundKind: recovery ? 'alert_recovery' : roundIndex === 0 ? 'initial' : 'follow_up',
      roundId,
      roundIndex,
    };
  }

  if (rounds.length === 0) {
    return undefined;
  }
  const createdFirstRound =
    !recovery &&
    (runStartedAt !== undefined
      ? Date.parse(rounds[0].started_at) >= Date.parse(runStartedAt)
      : rounds.length === 1);
  const roundIndex = createdFirstRound ? 0 : rounds.length - 1;
  return {
    roundKind: recovery ? 'alert_recovery' : createdFirstRound ? 'initial' : 'follow_up',
    roundId: rounds[roundIndex].id,
    roundIndex,
  };
};
