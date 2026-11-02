/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_RECOVERED_FOLLOW_UP } from '../client/investigations_client';

export type OnlineEvalsRoundKind = 'initial' | 'follow_up' | 'alert_recovery';

export interface ClassifiableRound {
  id: string;
  started_at: string;
}

export interface OnlineEvalsRoundClassification {
  roundKind: OnlineEvalsRoundKind;
  roundId: string;
  /**
   * The recovery round's verdict on the original root cause. Absent until the recovery round
   * records it as a field rather than free text.
   */
  recoveryVerdict?: string;
}

/**
 * Works out which round an investigation run created and what kind it is. Runs inside the run,
 * after the agent's round, so the latest round is always the one this run created.
 */
export const classifyInvestigationRun = ({
  rounds,
  followUp,
  runStartedAt,
}: {
  rounds: readonly ClassifiableRound[];
  followUp?: string;
  /** When the investigation workflow run started. */
  runStartedAt: string;
}): OnlineEvalsRoundClassification | undefined => {
  if (rounds.length === 0) {
    return undefined;
  }
  const latestRound = rounds[rounds.length - 1];

  if (followUp === ALERT_RECOVERED_FOLLOW_UP) {
    return { roundKind: 'alert_recovery', roundId: latestRound.id };
  }

  // Covers every entry point, including Slack runs that pass no context: the run created the
  // investigation's first round only if that round started after the run did.
  if (Date.parse(rounds[0].started_at) >= Date.parse(runStartedAt)) {
    return { roundKind: 'initial', roundId: rounds[0].id };
  }

  return { roundKind: 'follow_up', roundId: latestRound.id };
};
