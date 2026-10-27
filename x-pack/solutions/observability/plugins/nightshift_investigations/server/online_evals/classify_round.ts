/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SET_HYPOTHESES_TOOL_ID } from '@kbn/agentic-investigations-plugin/common';
import { ALERT_RECOVERED_FOLLOW_UP } from '../client/investigations_client';
import type { RawRoundStep } from '../investigation_round/round_loader';

export type OnlineEvalsRoundKind = 'initial' | 'follow_up' | 'alert_recovery';

export interface ClassifiableRound {
  id: string;
  started_at: string;
  steps: readonly RawRoundStep[];
}

export interface OnlineEvalsRoundClassification {
  roundKind: OnlineEvalsRoundKind;
  roundId: string;
  /** Follow-ups only: whether this round confirmed a root cause that wasn't confirmed before. */
  rootCauseChanged: boolean;
  /**
   * The recovery round's verdict on the original root cause. Absent until the recovery round
   * records it as a field rather than free text.
   */
  recoveryVerdict?: string;
}

const normalizeCandidate = (candidate: string): string =>
  candidate.replace(/\s+/g, ' ').trim().toLowerCase();

/**
 * Root causes the round's last `set_hypotheses` call confirmed, or `undefined` when the round
 * didn't call it. Each call replaces the whole list, so only the last one counts.
 */
const getConfirmedRootCauses = (round: ClassifiableRound): Set<string> | undefined => {
  const lastCall = [...round.steps]
    .reverse()
    .find(({ type, tool_id: toolId }) => type === 'tool_call' && toolId === SET_HYPOTHESES_TOOL_ID);
  if (!lastCall) {
    return undefined;
  }

  const hypotheses = lastCall.params?.hypotheses;
  if (!Array.isArray(hypotheses)) {
    return new Set();
  }
  return new Set(
    hypotheses.flatMap((hypothesis: unknown) => {
      if (typeof hypothesis !== 'object' || hypothesis === null) {
        return [];
      }
      const { candidate, status } = hypothesis as { candidate?: unknown; status?: unknown };
      return status === 'confirmed' && typeof candidate === 'string'
        ? [normalizeCandidate(candidate)]
        : [];
    })
  );
};

const hasNewRootCause = (rounds: readonly ClassifiableRound[], roundIndex: number): boolean => {
  const confirmedNow = getConfirmedRootCauses(rounds[roundIndex]);
  if (!confirmedNow || confirmedNow.size === 0) {
    return false;
  }

  let confirmedBefore = new Set<string>();
  for (let index = roundIndex - 1; index >= 0; index--) {
    const confirmed = getConfirmedRootCauses(rounds[index]);
    if (confirmed) {
      confirmedBefore = confirmed;
      break;
    }
  }

  return [...confirmedNow].some((candidate) => !confirmedBefore.has(candidate));
};

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
  const latestIndex = rounds.length - 1;

  if (followUp === ALERT_RECOVERED_FOLLOW_UP) {
    return {
      roundKind: 'alert_recovery',
      roundId: rounds[latestIndex].id,
      rootCauseChanged: false,
    };
  }

  // Covers every entry point, including Slack runs that pass no context: the run created the
  // investigation's first round only if that round started after the run did.
  if (Date.parse(rounds[0].started_at) >= Date.parse(runStartedAt)) {
    return { roundKind: 'initial', roundId: rounds[0].id, rootCauseChanged: false };
  }

  return {
    roundKind: 'follow_up',
    roundId: rounds[latestIndex].id,
    rootCauseChanged: hasNewRootCause(rounds, latestIndex),
  };
};
