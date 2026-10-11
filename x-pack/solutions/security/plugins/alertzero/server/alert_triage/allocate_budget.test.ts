/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { allocateBudget, getSweepBudget } from './allocate_budget';
import {
  ALERT_COST,
  BATCH_ALERT_CAP,
  BATCH_OVERHEAD_COST,
  IN_FLIGHT_CEILING,
  MIN_ALERTS_PER_RULE,
} from './constants';
import { makeAlert, makeAlerts } from './test_helpers';

describe('getSweepBudget', () => {
  it.each([5, 10, 15, 30, 60])(
    'keeps the hourly total when the sweep interval is %i minutes',
    (intervalMinutes) => {
      const perSweep = getSweepBudget(600, intervalMinutes);

      expect(perSweep * (60 / intervalMinutes)).toBe(600);
    }
  );
});

describe('allocateBudget', () => {
  it('serves every quiet rule even when one busy rule has a large backlog at equal risk', () => {
    const busy = makeAlerts(500, { ruleId: 'busy' });
    const quiet = Array.from({ length: 20 }, (_, i) => makeAlerts(3, { ruleId: `quiet-${i}` }));

    const { batches } = allocateBudget({
      alerts: [...busy, ...quiet.flat()],
      budget: 200,
      maxBatches: IN_FLIGHT_CEILING,
    });

    const served = batches.map(({ ruleId }) => ruleId);
    expect(served).toContain('busy');
    for (let i = 0; i < 20; i++) {
      expect(served).toContain(`quiet-${i}`);
    }
  });

  it('gives the most urgent rule its alerts first and sorts a batch by risk then age', () => {
    const lowOld = makeAlert({ riskScore: 10, timestamp: 1 });
    const highNew = makeAlert({ riskScore: 90, timestamp: 9 });
    const highOld = makeAlert({ riskScore: 90, timestamp: 2 });

    const { batches } = allocateBudget({
      alerts: [lowOld, highNew, highOld],
      budget: 100,
      maxBatches: 1,
    });

    expect(batches[0].alerts).toEqual([highOld, highNew, lowOld]);
  });

  it('grows a lone rule to the per-batch cap and no further', () => {
    const { batches } = allocateBudget({
      alerts: makeAlerts(BATCH_ALERT_CAP + 50),
      budget: 10_000,
      maxBatches: 5,
    });

    expect(batches).toHaveLength(1);
    expect(batches[0].alerts).toHaveLength(BATCH_ALERT_CAP);
  });

  it('shares the remainder round-robin once every rule has its minimum', () => {
    const alerts = [...makeAlerts(80, { ruleId: 'a' }), ...makeAlerts(80, { ruleId: 'b' })];
    const budget = 2 * (BATCH_OVERHEAD_COST + MIN_ALERTS_PER_RULE) + 10 * ALERT_COST;

    const { batches } = allocateBudget({ alerts, budget, maxBatches: 5 });

    expect(batches.map(({ alerts: a }) => a.length)).toEqual([
      MIN_ALERTS_PER_RULE + 5,
      MIN_ALERTS_PER_RULE + 5,
    ]);
  });

  it('serves no more rules than there are free in-flight slots', () => {
    const alerts = ['a', 'b', 'c'].flatMap((ruleId) => makeAlerts(2, { ruleId }));

    expect(allocateBudget({ alerts, budget: 1000, maxBatches: 2 }).batches).toHaveLength(2);
  });

  it('starts nothing when the budget cannot pay for a batch', () => {
    expect(
      allocateBudget({ alerts: makeAlerts(5), budget: BATCH_OVERHEAD_COST, maxBatches: 5 })
    ).toEqual({ batches: [], cost: 0 });
  });

  describe('property: seeded random inputs', () => {
    const random = (seed: number) => {
      let state = seed;
      return () => {
        state = (state * 1664525 + 1013904223) % 4294967296;
        return state / 4294967296;
      };
    };
    const buildAlerts = (seed: number) => {
      const next = random(seed);
      const ruleCount = 1 + Math.floor(next() * 30);
      return Array.from({ length: Math.floor(next() * 400) }, () =>
        makeAlert({
          ruleId: `rule-${Math.floor(next() * ruleCount)}`,
          riskScore: Math.floor(next() * 100),
          timestamp: Math.floor(next() * 1000),
        })
      );
    };

    it.each(Array.from({ length: 25 }, (_, i) => i + 1))(
      'seed %i: stays within budget, one batch per rule, and is deterministic',
      (seed) => {
        const alerts = buildAlerts(seed);
        const budget = 20 + ((seed * 37) % 400);

        const first = allocateBudget({ alerts, budget, maxBatches: IN_FLIGHT_CEILING });
        const second = allocateBudget({ alerts, budget, maxBatches: IN_FLIGHT_CEILING });

        const cost = first.batches.reduce(
          (sum, { alerts: a }) => sum + BATCH_OVERHEAD_COST + a.length * ALERT_COST,
          0
        );
        expect(cost).toBe(first.cost);
        expect(cost).toBeLessThanOrEqual(budget);
        const ruleIds = first.batches.map(({ ruleId }) => ruleId);
        expect(new Set(ruleIds).size).toBe(ruleIds.length);
        first.batches.forEach(({ alerts: a }) =>
          expect(a.length).toBeLessThanOrEqual(BATCH_ALERT_CAP)
        );
        expect(second).toEqual(first);
      }
    );
  });
});
