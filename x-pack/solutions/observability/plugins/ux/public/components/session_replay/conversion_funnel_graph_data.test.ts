/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunnelStepStats } from '../../../common/session_funnel';
import {
  formatFunnelCount,
  formatFunnelPercent,
  funnelFlowAreaPath,
  funnelNiceMax,
  hasFunnelDropOff,
  toFunnelFlowStages,
} from './conversion_funnel_graph_data';

const step = (
  overrides: Partial<FunnelStepStats> & Pick<FunnelStepStats, 'label' | 'count'>
): FunnelStepStats => ({
  type: 'page',
  value: overrides.label.toLowerCase(),
  conversionFromStart: 1,
  conversionFromPrevious: 1,
  dropOffCount: 0,
  sampleDroppedSessionIds: [],
  ...overrides,
});

describe('toFunnelFlowStages', () => {
  it('keeps remaining counts and drop-off from the previous step', () => {
    const stages = toFunnelFlowStages([
      step({ label: 'Home', count: 100, conversionFromStart: 1 }),
      step({
        label: 'Cart',
        count: 80,
        conversionFromStart: 0.8,
        conversionFromPrevious: 0.8,
        dropOffCount: 20,
        sampleDroppedSessionIds: ['s-drop-1'],
      }),
      step({
        label: 'Pay',
        count: 50,
        conversionFromStart: 0.5,
        conversionFromPrevious: 0.625,
        dropOffCount: 30,
      }),
    ]);

    expect(stages?.map((stage) => stage.count)).toEqual([100, 80, 50]);
    expect(stages?.[0].dropOffCount).toBe(0);
    expect(stages?.[0].previousLabel).toBeNull();
    expect(stages?.[1].dropOffCount).toBe(20);
    expect(stages?.[1].dropOffRate).toBe(0.2);
    expect(stages?.[1].previousLabel).toBe('Home');
    expect(stages?.[1].sampleDroppedSessionIds).toEqual(['s-drop-1']);
    expect(stages?.[2].dropOffRate).toBe(0.375);
  });

  it('returns null when nobody entered the first step', () => {
    expect(toFunnelFlowStages([step({ label: 'Home', count: 0 })])).toBeNull();
    expect(toFunnelFlowStages([])).toBeNull();
  });
});

describe('funnelNiceMax', () => {
  it('rounds up to a 1-2-5 ceiling', () => {
    expect(funnelNiceMax(200)).toBe(200);
    expect(funnelNiceMax(134)).toBe(200);
    expect(funnelNiceMax(629000)).toBe(1000000);
  });
});

describe('formatFunnelCount', () => {
  it('compacts thousands', () => {
    expect(formatFunnelCount(200)).toBe('200');
    expect(formatFunnelCount(629000)).toBe('629K');
  });
});

describe('funnelFlowAreaPath', () => {
  it('hangs from the top axis and curves between bar bottoms', () => {
    expect(funnelFlowAreaPath(10, 40, 30, 60, 0)).toBe('M10,0 L30,0 L30,60 C20,60 20,40 10,40 Z');
  });
});

describe('hasFunnelDropOff', () => {
  it('is true only when a step lost sessions', () => {
    expect(hasFunnelDropOff([step({ label: 'Home', count: 10 })])).toBe(false);
    expect(hasFunnelDropOff([step({ label: 'Home', count: 10, dropOffCount: 2 })])).toBe(true);
  });
});

describe('formatFunnelPercent', () => {
  it('rounds to one decimal', () => {
    expect(formatFunnelPercent(1)).toBe('100%');
    expect(formatFunnelPercent(0.127)).toBe('12.7%');
  });
});
