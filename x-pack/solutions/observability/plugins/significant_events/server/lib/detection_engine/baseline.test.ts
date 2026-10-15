/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { checkBaseline } from './baseline';

const SETTINGS = { min_samples: 5, history_buckets: 60, mad_k: 3 };

function historyOf(values: number[], startMinute = 0) {
  return values.map((value, index) => ({
    bucket_start: new Date(Date.UTC(2026, 9, 15, 10, startMinute + index)).toISOString(),
    value,
  }));
}

describe('checkBaseline', () => {
  it('marks a value well above a noisy history as above normal', () => {
    const result = checkBaseline({
      value: 0.4,
      unit: 'ratio',
      policy: 'own_history',
      history: historyOf([0.01, 0.02, 0.01, 0.015, 0.012, 0.018, 0.011]),
      excludeWindows: [],
      settings: SETTINGS,
    });

    expect(result.decision).toBe('above_normal');
    expect(result.samples).toBe(7);
    expect(result.median).toBe(0.012);
  });

  it('keeps a value inside the normal band as background', () => {
    const result = checkBaseline({
      value: 0.02,
      unit: 'ratio',
      policy: 'own_history',
      history: historyOf([0.01, 0.02, 0.01, 0.015, 0.012, 0.018, 0.011]),
      excludeWindows: [],
      settings: SETTINGS,
    });

    expect(result.decision).toBe('background');
  });

  it('applies the unit floor when the history is flat', () => {
    const flat = historyOf([0, 0, 0, 0, 0, 0]);

    expect(
      checkBaseline({
        value: 2,
        unit: 'count',
        policy: 'own_history',
        history: flat,
        excludeWindows: [],
        settings: SETTINGS,
      }).decision
    ).toBe('background');
    expect(
      checkBaseline({
        value: 4,
        unit: 'count',
        policy: 'own_history',
        history: flat,
        excludeWindows: [],
        settings: SETTINGS,
      }).threshold
    ).toBe(3);
  });

  it('reports warming up until enough samples exist', () => {
    const result = checkBaseline({
      value: 100,
      unit: 'count',
      policy: 'own_history',
      history: historyOf([1, 1, 1]),
      excludeWindows: [],
      settings: SETTINGS,
    });

    expect(result).toEqual({ decision: 'warming_up', samples: 3, excludedSamples: 0 });
  });

  it('leaves out buckets in which an event was open, so an incident does not become normal', () => {
    // Ten normal buckets, then ten incident buckets during which an event was open.
    const history = historyOf([...Array(10).fill(1), ...Array(10).fill(50)]);
    const incidentWindow = { from: history[10].bucket_start };

    const result = checkBaseline({
      value: 50,
      unit: 'count',
      policy: 'own_history',
      history,
      excludeWindows: [incidentWindow],
      settings: SETTINGS,
    });

    expect(result.decision).toBe('above_normal');
    expect(result.excludedSamples).toBe(10);
    expect(result.median).toBe(1);
  });

  it('still finds normal samples when an incident is longer than the sample window', () => {
    // Twenty normal buckets, then an incident open for more buckets than the window holds.
    const history = historyOf([...Array(20).fill(1), ...Array(100).fill(40)]);

    const result = checkBaseline({
      value: 40,
      unit: 'count',
      policy: 'own_history',
      history,
      excludeWindows: [{ from: history[20].bucket_start }],
      settings: { ...SETTINGS, history_buckets: 60 },
    });

    expect(result.decision).toBe('above_normal');
    expect(result.samples).toBe(20);
    expect(result.excludedSamples).toBe(100);
  });

  it('skips the check for customer alerts', () => {
    expect(
      checkBaseline({
        value: 1,
        unit: 'alert',
        policy: 'skip',
        history: [],
        excludeWindows: [],
        settings: SETTINGS,
      }).decision
    ).toBe('skipped');
  });

  it('treats the history of a never-seen series as zero', () => {
    expect(
      checkBaseline({
        value: 5,
        unit: 'count',
        policy: 'implicit_zero',
        history: [],
        excludeWindows: [],
        settings: SETTINGS,
      }).decision
    ).toBe('above_normal');
  });
});
