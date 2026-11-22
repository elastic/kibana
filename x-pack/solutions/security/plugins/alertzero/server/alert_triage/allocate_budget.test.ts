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
  TRIAGE_CACHE_CONFIRM_TAG_PREFIX,
} from './constants';
import { makeAlert, makeAlerts } from './test_helpers';
import type { TriageAlert } from './types';

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
  describe('with severityFirst', () => {
    const SWEEP = 325;

    it('gives a busy high rule a full batch before the medium rules get their first share', () => {
      const high = makeAlerts(200, { ruleId: 'high', severity: 'high', riskScore: 73 });
      const medium = Array.from({ length: 10 }, (_, i) =>
        makeAlerts(40, { ruleId: `medium-${i}`, severity: 'medium', riskScore: 47 })
      );
      const alerts = [...high, ...medium.flat()];
      const sizeOf = (severityFirst: boolean) =>
        allocateBudget({
          alerts,
          budget: SWEEP,
          maxBatches: IN_FLIGHT_CEILING,
          severityFirst,
        }).batches.find(({ ruleId }) => ruleId === 'high')?.alerts.length;

      expect(sizeOf(false)).toBe(MIN_ALERTS_PER_RULE);
      expect(sizeOf(true)).toBe(BATCH_ALERT_CAP);
    });

    it('serves a critical rule first even when a medium rule has a higher risk score', () => {
      const critical = makeAlerts(5, { ruleId: 'critical', severity: 'critical', riskScore: 40 });
      const medium = makeAlerts(5, { ruleId: 'medium', severity: 'medium', riskScore: 90 });

      const { batches } = allocateBudget({
        alerts: [...medium, ...critical],
        budget: SWEEP,
        maxBatches: 1,
        severityFirst: true,
      });

      expect(batches.map(({ ruleId }) => ruleId)).toEqual(['critical']);
    });

    it('changes nothing when no rule has a high or critical alert, or the severity is missing', () => {
      const alerts = [
        ...makeAlerts(80, { ruleId: 'a', severity: 'medium' }),
        ...makeAlerts(80, { ruleId: 'b' }),
        ...makeAlerts(80, { ruleId: 'c', severity: 'low' }),
      ];
      const plan = (severityFirst: boolean) =>
        allocateBudget({ alerts, budget: 100, maxBatches: 5, severityFirst });

      expect(plan(true)).toEqual(plan(false));
    });
  });

  describe('with an alert tagged to confirm a cache record', () => {
    const confirmTag = `${TRIAGE_CACHE_CONFIRM_TAG_PREFIX}verdict-cache-k1`;

    // A low rule behind many higher-risk rules gets no batch when the budget runs out. One alert of it can turn a pending record
    // active and cover hundreds of its alerts, so that rule must not wait.
    it('serves a low-risk rule with a confirm alert before higher-risk rules when the budget is short', () => {
      const higher = Array.from({ length: 12 }, (_, i) =>
        makeAlerts(40, { ruleId: `medium-${i}`, riskScore: 47 })
      );
      const low = makeAlerts(40, { ruleId: 'low', riskScore: 21 });
      const confirm = makeAlert({ ruleId: 'low', riskScore: 21, tags: [confirmTag] });
      const batchesFor = (lowAlerts: TriageAlert[]) =>
        allocateBudget({
          alerts: [...higher.flat(), ...lowAlerts],
          budget: 325,
          maxBatches: IN_FLIGHT_CEILING,
        }).batches;
      const withConfirm = batchesFor([...low, confirm]);
      const ruleIds = withConfirm.map(({ ruleId }) => ruleId);

      expect(batchesFor(low).find(({ ruleId }) => ruleId === 'low')).toBeUndefined();
      expect(withConfirm.find(({ ruleId }) => ruleId === 'low')?.alerts[0]).toBe(confirm);
      expect(new Set(ruleIds).size).toBe(ruleIds.length);
    });

    // One batch per rule: a second batch of the same rule would pay the overhead twice and analyze no alert sooner.
    it('gives a rule with a confirm alert one batch, even when the budget pays for more', () => {
      const confirm = makeAlert({ ruleId: 'low', tags: [confirmTag] });
      const { batches } = allocateBudget({
        alerts: [
          confirm,
          ...makeAlerts(5, { ruleId: 'low' }),
          ...makeAlerts(5, { ruleId: 'other' }),
        ],
        budget: 325,
        maxBatches: IN_FLIGHT_CEILING,
      });

      expect(batches.map(({ ruleId }) => ruleId).sort()).toEqual(['low', 'other']);
    });

    it('puts the confirm alert first in its batch even when other alerts of the rule have a higher risk', () => {
      const riskier = makeAlerts(5, { riskScore: 90 });
      const confirm = makeAlert({ riskScore: 10, tags: [confirmTag] });

      const { batches } = allocateBudget({
        alerts: [...riskier, confirm],
        budget: 8,
        maxBatches: 1,
      });

      expect(batches[0].alerts).toEqual([confirm, riskier[0], riskier[1]]);
    });

    it('still serves urgent rules first with severityFirst', () => {
      const high = makeAlerts(5, { ruleId: 'high', severity: 'high', riskScore: 30 });
      const confirm = makeAlert({ ruleId: 'low', severity: 'low', tags: [confirmTag] });

      const { batches } = allocateBudget({
        alerts: [confirm, ...high],
        budget: 325,
        maxBatches: 1,
        severityFirst: true,
      });

      expect(batches.map(({ ruleId }) => ruleId)).toEqual(['high']);
    });
  });
});
