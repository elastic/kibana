/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { computeFunnel, formatSampleSessionId, type FunnelStepDef } from './session_funnel';

const steps: FunnelStepDef[] = [
  { type: 'page', value: 'catalog', label: 'Catalog' },
  { type: 'activity', value: 'Add to cart', label: 'Add to cart' },
  { type: 'page', value: 'cart', label: 'Cart' },
];

describe('computeFunnel', () => {
  it('requires steps to occur in order', () => {
    const result = computeFunnel(
      [
        { sessionId: 'in-order', firstTs: [1, 2, 3] },
        { sessionId: 'skip-middle', firstTs: [1, null, 3] },
        { sessionId: 'out-of-order', firstTs: [10, 8, 20] },
      ],
      steps
    );

    expect(result.sessionsConsidered).toBe(3);
    expect(result.steps.map((s) => s.count)).toEqual([3, 1, 1]);
    expect(result.steps[1].dropOffCount).toBe(2);
    expect(result.steps[1].sampleDroppedSessionIds).toEqual(['skip-middle', 'out-of-order']);
    expect(result.steps[2].conversionFromStart).toBeCloseTo(1 / 3);
  });

  it('treats an empty set as zero conversion', () => {
    const result = computeFunnel([], steps);
    expect(result.steps.every((s) => s.count === 0 && s.conversionFromStart === 0)).toBe(true);
  });

  it('counts a later step at the same timestamp as in order', () => {
    const result = computeFunnel([{ sessionId: 'same-ts', firstTs: [5, 5, 5] }], steps);
    expect(result.steps.map((s) => s.count)).toEqual([1, 1, 1]);
    expect(result.steps[2].conversionFromStart).toBe(1);
  });
});

describe('formatSampleSessionId', () => {
  it('keeps short ids intact so acme-funnel samples stay distinct', () => {
    expect(formatSampleSessionId('acme-funnel-0042')).toBe('acme-funnel-0042');
  });

  it('keeps the unique suffix on long ids', () => {
    expect(formatSampleSessionId('aa0a8c12-7e3b-4d91-9c2f-1b8e4f0a1234')).toBe('aa0a8c…1234');
  });
});
