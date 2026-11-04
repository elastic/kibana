/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HYPOTHESES_ATTACHMENT_TYPE } from '@kbn/agentic-investigations-plugin/common';
import { ALERT_RECOVERED_FOLLOW_UP } from '../client/investigations_client';
import { resolveRound, type ResolvableConversation } from './round_outcome';

const R1 = { id: 'r1', started_at: '2026-11-02T10:00:00.000Z' };
const R2 = { id: 'r2', started_at: '2026-11-02T10:10:00.000Z' };
const R3 = { id: 'r3', started_at: '2026-11-02T10:20:00.000Z' };
const BEFORE_R1 = '2026-11-02T09:59:00.000Z';
/** Written at the end of round 1, before round 2 starts. */
const AFTER_R1 = '2026-11-02T10:05:00.000Z';
/** Written at the end of round 2, before round 3 starts. */
const AFTER_R2 = '2026-11-02T10:15:00.000Z';

const gateway = (status: string) => ({ candidate: 'Gateway pool exhaustion', status });
const database = (status: string) => ({ candidate: 'Database failover', status });

const conversation = (
  rounds: ResolvableConversation['rounds'],
  ...versions: Array<[at: string, hypotheses: unknown[]]>
): ResolvableConversation => ({
  rounds,
  attachments: [
    {
      type: HYPOTHESES_ATTACHMENT_TYPE,
      versions: versions.map(([at, hypotheses]) => ({ created_at: at, data: { hypotheses } })),
    },
  ],
});

describe('resolveRound', () => {
  it.each([
    {
      name: 'found: a cause is confirmed that was not before',
      before: [gateway('investigating')],
      after: [gateway('confirmed'), database('dismissed')],
      outcome: 'found',
      hasConfirmedCause: true,
    },
    {
      name: 'found: a second cause is confirmed next to the earlier one',
      before: [gateway('confirmed'), database('investigating')],
      after: [gateway('confirmed'), database('confirmed')],
      outcome: 'found',
      hasConfirmedCause: true,
    },
    {
      name: 'changed: the confirmed cause is dismissed and another confirmed',
      before: [gateway('confirmed'), database('investigating')],
      after: [gateway('dismissed'), database('confirmed')],
      outcome: 'changed',
      hasConfirmedCause: true,
    },
    {
      name: 'withdrawn: the confirmed cause is reopened and nothing replaces it',
      before: [gateway('confirmed')],
      after: [gateway('investigating')],
      outcome: 'withdrawn',
      hasConfirmedCause: false,
    },
    {
      name: 'unchanged: the same cause stays confirmed',
      before: [gateway('confirmed')],
      after: [gateway('confirmed')],
      outcome: 'unchanged',
      hasConfirmedCause: true,
    },
    {
      name: 'unchanged: still nothing confirmed (no ground truth, distinct from unknown)',
      before: [gateway('investigating')],
      after: [gateway('dismissed')],
      outcome: 'unchanged',
      hasConfirmedCause: false,
    },
    {
      name: 'unknown: the confirmed cause disappeared (reworded), while another is confirmed',
      before: [gateway('confirmed')],
      after: [database('confirmed')],
      outcome: 'unknown',
      hasConfirmedCause: true,
    },
  ])('$name', ({ before, after, outcome, hasConfirmedCause }) => {
    expect(
      resolveRound(conversation([R1, R2], [AFTER_R1, before], [AFTER_R2, after]), {
        roundId: 'r2',
      })
    ).toEqual({ roundKind: 'follow_up', roundId: 'r2', outcome, hasConfirmedCause });
  });

  it('judges a round by the last version before the next round, not later ones', () => {
    expect(
      resolveRound(
        conversation(
          [R1, R2, R3],
          [AFTER_R1, [gateway('investigating')]],
          [AFTER_R2, [gateway('confirmed')]],
          ['2026-11-02T10:25:00.000Z', [gateway('dismissed')]]
        ),
        { roundId: 'r2' }
      )
    ).toMatchObject({ outcome: 'found' });
  });

  it('is unknown with no record, or for a round that is not saved yet', () => {
    expect(resolveRound({ rounds: [R1, R2] }, { roundId: 'r2' })).toEqual({
      roundKind: 'follow_up',
      roundId: 'r2',
      outcome: 'unknown',
    });
    expect(resolveRound({ rounds: [] }, { roundId: 'r1' })).toEqual({
      roundKind: 'initial',
      roundId: 'r1',
      outcome: 'unknown',
    });
    expect(resolveRound({ rounds: [R1] }, { roundId: 'r2' })).toMatchObject({
      roundKind: 'follow_up',
      outcome: 'unknown',
    });
  });

  it('classifies the first round as initial and diffs it against nothing', () => {
    expect(
      resolveRound(conversation([R1], [AFTER_R1, [gateway('confirmed')]]), { roundId: 'r1' })
    ).toEqual({ roundKind: 'initial', roundId: 'r1', outcome: 'found', hasConfirmedCause: true });
  });

  it('is an alert recovery only when followUp says so, never from the message', () => {
    const rounds = [
      R1,
      { ...R2, input: { message: 'An alert in this investigation has recovered.' } },
    ];
    expect(resolveRound({ rounds }, { roundId: 'r2' })).toMatchObject({ roundKind: 'follow_up' });
    expect(
      resolveRound({ rounds }, { roundId: 'r2', followUp: ALERT_RECOVERED_FOLLOW_UP })
    ).toMatchObject({ roundKind: 'alert_recovery' });
    expect(
      resolveRound({ rounds }, { runStartedAt: AFTER_R1, followUp: ALERT_RECOVERED_FOLLOW_UP })
    ).toMatchObject({ roundKind: 'alert_recovery', roundId: 'r2' });
  });

  it('without a round id, uses runStartedAt to tell whether the run created the first round', () => {
    expect(resolveRound({ rounds: [R1] }, { runStartedAt: BEFORE_R1 })).toMatchObject({
      roundKind: 'initial',
      roundId: 'r1',
    });
    expect(resolveRound({ rounds: [R1, R2] }, { runStartedAt: AFTER_R1 })).toMatchObject({
      roundKind: 'follow_up',
      roundId: 'r2',
    });
    // The run's round is not saved yet, and the only saved round predates the run.
    expect(resolveRound({ rounds: [R1] }, { runStartedAt: AFTER_R1 })).toMatchObject({
      roundKind: 'follow_up',
      roundId: 'r1',
    });
    expect(resolveRound({ rounds: [] }, { runStartedAt: BEFORE_R1 })).toBeUndefined();
  });
});
