/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deriveEventInput, nextEventStatus } from './state_machine';

/**
 * Copy of Alerting v2's basic transitions for `breached` and `recovered`
 * (alerting_v2/server/lib/director/strategies/basic_strategy.ts). Alerting v2 does not expose its
 * state machine to plugins, so the engine keeps its own; this table is the contract they share.
 */
const ALERTING_V2_LIVE_TRANSITIONS = {
  active: { breached: 'active', recovered: 'recovering' },
  recovering: { breached: 'active', recovered: 'inactive' },
} as const;

describe('nextEventStatus', () => {
  it('agrees with Alerting v2 on live transitions', () => {
    expect(nextEventStatus('active', 'member_firing').to).toBe(
      ALERTING_V2_LIVE_TRANSITIONS.active.breached
    );
    expect(nextEventStatus('active', 'all_healthy').to).toBe(
      ALERTING_V2_LIVE_TRANSITIONS.active.recovered
    );
    expect(nextEventStatus('recovering', 'member_firing').to).toBe(
      ALERTING_V2_LIVE_TRANSITIONS.recovering.breached
    );
    expect(nextEventStatus('recovering', 'quiet_period_elapsed').to).toBe(
      ALERTING_V2_LIVE_TRANSITIONS.recovering.recovered
    );
  });

  it('closes a recovering event only after the quiet period', () => {
    expect(nextEventStatus('recovering', 'all_healthy')).toEqual({ to: 'recovering' });
    expect(nextEventStatus('recovering', 'quiet_period_elapsed')).toEqual({
      to: 'inactive',
      closeReason: 'recovered',
    });
  });

  it('never treats missing data as recovery', () => {
    expect(nextEventStatus('active', 'unknown').to).toBe('active');
    expect(nextEventStatus('recovering', 'unknown').to).toBe('recovering');
  });

  it('reopens a closed event when the same problem returns', () => {
    expect(nextEventStatus('inactive', 'member_firing')).toEqual({ to: 'active', reopens: true });
  });

  it('closes on operator input and dismissal with the matching reason', () => {
    expect(nextEventStatus('active', 'operator_close').closeReason).toBe('operator');
    expect(nextEventStatus('recovering', 'dismiss').closeReason).toBe('dismissed');
  });
});

describe('deriveEventInput', () => {
  it('reports firing when any member fires', () => {
    expect(
      deriveEventInput({
        members: [
          { health: 'healthy', healthyStreak: 5 },
          { health: 'firing', healthyStreak: 0 },
        ],
        quietPeriodBuckets: 2,
      })
    ).toBe('member_firing');
  });

  it('reports unknown when any member was not evaluated and none fires', () => {
    expect(
      deriveEventInput({
        members: [
          { health: 'healthy', healthyStreak: 5 },
          { health: 'unknown', healthyStreak: 0 },
        ],
        quietPeriodBuckets: 2,
      })
    ).toBe('unknown');
  });

  it('waits for every member to stay healthy for the quiet period', () => {
    expect(
      deriveEventInput({
        members: [
          { health: 'healthy', healthyStreak: 2 },
          { health: 'healthy', healthyStreak: 1 },
        ],
        quietPeriodBuckets: 2,
      })
    ).toBe('all_healthy');
    expect(
      deriveEventInput({
        members: [
          { health: 'healthy', healthyStreak: 2 },
          { health: 'healthy', healthyStreak: 3 },
        ],
        quietPeriodBuckets: 2,
      })
    ).toBe('quiet_period_elapsed');
  });
});
