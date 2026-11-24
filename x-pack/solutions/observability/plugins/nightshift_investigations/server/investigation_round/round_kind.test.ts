/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_RECOVERED_FOLLOW_UP } from '../client/investigations_client';
import { resolveRound } from './round_kind';

const R1 = { id: 'r1', started_at: '2026-11-02T10:00:00.000Z' };
const R2 = { id: 'r2', started_at: '2026-11-02T10:10:00.000Z' };
const R3 = { id: 'r3', started_at: '2026-11-02T10:20:00.000Z' };
const BEFORE_R1 = '2026-11-02T09:59:00.000Z';
const AFTER_R1 = '2026-11-02T10:05:00.000Z';

describe('resolveRound', () => {
  it('classifies a saved round by its place in the conversation', () => {
    expect(resolveRound({ rounds: [R1, R2, R3] }, { roundId: 'r1' })).toEqual({
      roundKind: 'initial',
      roundId: 'r1',
      roundIndex: 0,
    });
    expect(resolveRound({ rounds: [R1, R2, R3] }, { roundId: 'r3' })).toEqual({
      roundKind: 'follow_up',
      roundId: 'r3',
      roundIndex: 2,
    });
  });

  it('places a round that is not saved yet after every saved round', () => {
    expect(resolveRound({ rounds: [] }, { roundId: 'r1' })).toEqual({
      roundKind: 'initial',
      roundId: 'r1',
      roundIndex: 0,
    });
    expect(resolveRound({ rounds: [R1] }, { roundId: 'r2' })).toEqual({
      roundKind: 'follow_up',
      roundId: 'r2',
      roundIndex: 1,
    });
  });

  it('is an alert recovery only when followUp says so, never from the message', () => {
    const rounds = [
      R1,
      { ...R2, input: { message: 'An alert in this investigation has recovered.' } },
    ];
    expect(resolveRound({ rounds }, { roundId: 'r2' })).toMatchObject({ roundKind: 'follow_up' });
    expect(
      resolveRound({ rounds }, { roundId: 'r2', followUp: ALERT_RECOVERED_FOLLOW_UP })
    ).toEqual({ roundKind: 'alert_recovery', roundId: 'r2', roundIndex: 1 });
    expect(
      resolveRound({ rounds }, { runStartedAt: AFTER_R1, followUp: ALERT_RECOVERED_FOLLOW_UP })
    ).toEqual({ roundKind: 'alert_recovery', roundId: 'r2', roundIndex: 1 });
  });

  it('without a round id, uses runStartedAt to tell whether the run created the first round', () => {
    expect(resolveRound({ rounds: [R1] }, { runStartedAt: BEFORE_R1 })).toEqual({
      roundKind: 'initial',
      roundId: 'r1',
      roundIndex: 0,
    });
    expect(resolveRound({ rounds: [R1, R2] }, { runStartedAt: AFTER_R1 })).toEqual({
      roundKind: 'follow_up',
      roundId: 'r2',
      roundIndex: 1,
    });
    // The run's round is not saved yet, and the only saved round predates the run.
    expect(resolveRound({ rounds: [R1] }, { runStartedAt: AFTER_R1 })).toMatchObject({
      roundKind: 'follow_up',
      roundId: 'r1',
    });
    expect(resolveRound({ rounds: [] }, { runStartedAt: BEFORE_R1 })).toBeUndefined();
  });

  it('without a round id or runStartedAt, a lone round is the initial one', () => {
    expect(resolveRound({ rounds: [R1] })).toMatchObject({ roundKind: 'initial', roundId: 'r1' });
    expect(resolveRound({ rounds: [R1, R2] })).toMatchObject({
      roundKind: 'follow_up',
      roundId: 'r2',
    });
  });
});
