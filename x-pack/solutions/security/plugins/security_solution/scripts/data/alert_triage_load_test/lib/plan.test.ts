/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildBurstPlan, buildSustainedPlan } from './plan';
import type { BurstPlanOptions, LoadPlan, SustainedPlanOptions } from './types';

const HOUR_MS = 60 * 60 * 1000;
const RULE_INTERVAL_MS = 5 * 60 * 1000;

const burstOptions = (overrides: Partial<BurstPlanOptions> = {}): BurstPlanOptions => ({
  seed: 1,
  ruleCount: 1,
  fpRate: 0.75,
  templateCounts: { truePositives: 10, falsePositives: 10 },
  batchCount: 1,
  batchSize: 100,
  ...overrides,
});

const sustainedOptions = (overrides: Partial<SustainedPlanOptions> = {}): SustainedPlanOptions => ({
  seed: 1,
  ruleCount: 300,
  fpRate: 0.75,
  templateCounts: { truePositives: 10, falsePositives: 10 },
  alertsPerHour: 1000,
  durationMs: HOUR_MS,
  ruleIntervalMs: RULE_INTERVAL_MS,
  maxBatchSize: 1000,
  ruleSkew: 0,
  ...overrides,
});

const alertsPerRule = (plan: LoadPlan): Map<number, number> => {
  const counts = new Map<number, number>();
  for (const { ruleIndex, alerts } of plan.batches) {
    counts.set(ruleIndex, (counts.get(ruleIndex) ?? 0) + alerts.length);
  }
  return counts;
};

describe('buildBurstPlan', () => {
  it.each([100, 500, 1000])('plans one batch of %d alerts dispatched at once', (batchSize) => {
    const plan = buildBurstPlan(burstOptions({ batchSize }));

    expect(plan.batches).toHaveLength(1);
    expect(plan.batches[0].alerts).toHaveLength(batchSize);
    expect(plan.batches[0].dispatchOffsetMs).toBe(0);
    expect(plan.totalAlerts).toBe(batchSize);
  });

  it('labels exactly the requested share of alerts as false positive', () => {
    const plan = buildBurstPlan(burstOptions({ batchSize: 101, fpRate: 0.75 }));

    expect(plan.falsePositiveAlerts).toBe(76);
    expect(plan.batches[0].alerts.filter(({ label }) => label === 'false_positive')).toHaveLength(
      76
    );
  });

  it('spreads batches over the rules round-robin', () => {
    const plan = buildBurstPlan(burstOptions({ batchCount: 5, batchSize: 10, ruleCount: 2 }));

    expect(plan.batches.filter(({ ruleIndex }) => ruleIndex === 0)).toHaveLength(3);
    expect(plan.batches.filter(({ ruleIndex }) => ruleIndex === 1)).toHaveLength(2);
  });

  it('picks template indexes from the pool of the alert label', () => {
    const plan = buildBurstPlan(
      burstOptions({ templateCounts: { truePositives: 3, falsePositives: 7 } })
    );

    for (const { label, templateIndex } of plan.batches[0].alerts) {
      expect(templateIndex).toBeLessThan(label === 'false_positive' ? 7 : 3);
    }
  });

  it('is repeatable for a seed and differs between seeds', () => {
    expect(buildBurstPlan(burstOptions({ seed: 7 }))).toEqual(
      buildBurstPlan(burstOptions({ seed: 7 }))
    );
    expect(buildBurstPlan(burstOptions({ seed: 7 }))).not.toEqual(
      buildBurstPlan(burstOptions({ seed: 8 }))
    );
  });

  it('rejects false positives when the pool has none', () => {
    expect(() =>
      buildBurstPlan(burstOptions({ templateCounts: { truePositives: 5, falsePositives: 0 } }))
    ).toThrow('no false-positive alerts');
  });

  it('rejects true positives when the pool has none', () => {
    expect(() =>
      buildBurstPlan(burstOptions({ templateCounts: { truePositives: 0, falsePositives: 5 } }))
    ).toThrow('no true-positive alerts');
  });

  it('allows an all-false-positive run with only false-positive templates', () => {
    const plan = buildBurstPlan(
      burstOptions({ fpRate: 1, templateCounts: { truePositives: 0, falsePositives: 5 } })
    );

    expect(plan.falsePositiveAlerts).toBe(100);
  });
});

describe('buildSustainedPlan', () => {
  it('plans the alert rate over the duration', () => {
    expect(buildSustainedPlan(sustainedOptions()).totalAlerts).toBe(1000);
    expect(buildSustainedPlan(sustainedOptions({ durationMs: 2 * HOUR_MS })).totalAlerts).toBe(
      2000
    );
  });

  it('hits the requested false-positive rate', () => {
    const plan = buildSustainedPlan(sustainedOptions());

    expect(plan.falsePositiveAlerts).toBe(750);
  });

  it('puts every alert into exactly one batch of a single rule', () => {
    const plan = buildSustainedPlan(sustainedOptions());

    expect(plan.batches.reduce((sum, { alerts }) => sum + alerts.length, 0)).toBe(1000);
    expect(new Set(plan.batches.map(({ batchId }) => batchId)).size).toBe(plan.batches.length);
  });

  it('dispatches batches in order of time', () => {
    const offsets = buildSustainedPlan(sustainedOptions()).batches.map(
      ({ dispatchOffsetMs }) => dispatchOffsetMs
    );

    expect(offsets).toEqual([...offsets].sort((a, b) => a - b));
  });

  it('dispatches a rule only on its own schedule', () => {
    const plan = buildSustainedPlan(sustainedOptions({ ruleCount: 2, alertsPerHour: 2000 }));

    for (const ruleIndex of [0, 1]) {
      const offsets = plan.batches
        .filter((batch) => batch.ruleIndex === ruleIndex)
        .map(({ dispatchOffsetMs }) => dispatchOffsetMs);

      expect(offsets.length).toBeGreaterThan(1);
      for (const offset of offsets) {
        expect((offset - offsets[0]) % RULE_INTERVAL_MS).toBe(0);
      }
    }
  });

  it('splits a batch above the maximum size', () => {
    const plan = buildSustainedPlan(
      sustainedOptions({
        ruleCount: 1,
        alertsPerHour: 600,
        ruleIntervalMs: HOUR_MS,
        maxBatchSize: 100,
      })
    );

    expect(plan.batches.length).toBeGreaterThanOrEqual(6);
    expect(Math.max(...plan.batches.map(({ alerts }) => alerts.length))).toBeLessThanOrEqual(100);
    expect(plan.totalAlerts).toBe(600);
  });

  it('concentrates alerts on the first rules when skewed', () => {
    const counts = alertsPerRule(
      buildSustainedPlan(sustainedOptions({ ruleCount: 20, alertsPerHour: 5000, ruleSkew: 2 }))
    );

    expect(counts.get(0) ?? 0).toBeGreaterThan(counts.get(19) ?? 0);
  });

  it('spreads alerts over many rules when not skewed', () => {
    const plan = buildSustainedPlan(sustainedOptions());

    expect(alertsPerRule(plan).size).toBeGreaterThan(200);
  });

  it('is repeatable for a seed', () => {
    expect(buildSustainedPlan(sustainedOptions({ seed: 3 }))).toEqual(
      buildSustainedPlan(sustainedOptions({ seed: 3 }))
    );
  });

  it.each([
    ['alertsPerHour', { alertsPerHour: 0 }],
    ['durationMs', { durationMs: 0 }],
    ['ruleIntervalMs', { ruleIntervalMs: 0 }],
    ['maxBatchSize', { maxBatchSize: 0 }],
  ])('rejects a non-positive %s', (_name, overrides) => {
    expect(() => buildSustainedPlan(sustainedOptions(overrides))).toThrow();
  });
});
