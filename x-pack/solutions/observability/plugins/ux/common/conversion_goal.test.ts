/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  computeGoalImpact,
  conversionGoalDraftsEqual,
  formatGoalMoney,
  sanitizeConversionGoal,
} from './conversion_goal';
import type { SessionFunnelResponse } from './session_funnel';

const funnel = (counts: number[]): SessionFunnelResponse => ({
  sessionsConsidered: counts[0] ?? 0,
  steps: counts.map((count, index) => ({
    label: `step-${index}`,
    type: 'page',
    value: `step-${index}`,
    count,
    conversionFromStart: counts[0] ? count / counts[0] : 0,
    conversionFromPrevious: index === 0 || !counts[index - 1] ? 1 : count / counts[index - 1],
    dropOffCount: index === 0 ? 0 : Math.max(0, counts[index - 1] - count),
    sampleDroppedSessionIds: [],
  })),
});

describe('sanitizeConversionGoal', () => {
  it('keeps a named checkout goal and clamps value', () => {
    expect(
      sanitizeConversionGoal({
        name: '  Checkout  ',
        value: 49.999,
        currency: 'usd',
        steps: [
          { type: 'page', value: ' catalog ', label: 'Catalog' },
          { type: 'activity', value: 'Add to cart' },
        ],
      })
    ).toEqual({
      name: 'Checkout',
      value: 50,
      currency: 'USD',
      steps: [
        { type: 'page', value: 'catalog', label: 'Catalog' },
        { type: 'activity', value: 'Add to cart' },
      ],
    });
  });

  it('drops empty steps and unknown types, and falls back on bad money', () => {
    const sanitized = sanitizeConversionGoal({
      name: '   ',
      value: -12,
      currency: '12',
      steps: [{ type: 'other', value: '' }, { type: 'activity', value: 'Buy' }, null],
    });
    expect(sanitized.value).toBe(0);
    expect(sanitized.currency).toBe('USD');
    expect(sanitized.steps).toEqual([{ type: 'activity', value: 'Buy' }]);
    expect(sanitized.name.length).toBeGreaterThan(0);
  });
});

describe('computeGoalImpact', () => {
  it('attributes completed last-step sessions and prices the drop-off', () => {
    expect(computeGoalImpact(funnel([100, 40, 25]), 40)).toEqual({
      entered: 100,
      converted: 25,
      conversionRate: 0.25,
      attributed: 1000,
      missed: 3000,
    });
  });

  it('returns zeros when the funnel is empty', () => {
    expect(computeGoalImpact({ sessionsConsidered: 0, steps: [] }, 49)).toEqual({
      entered: 0,
      converted: 0,
      conversionRate: 0,
      attributed: 0,
      missed: 0,
    });
  });
});

describe('conversionGoalDraftsEqual', () => {
  it('treats missing labels as empty', () => {
    expect(
      conversionGoalDraftsEqual(
        { name: 'A', value: 1, currency: 'USD', steps: [{ type: 'page', value: 'x' }] },
        { name: 'A', value: 1, currency: 'USD', steps: [{ type: 'page', value: 'x', label: '' }] }
      )
    ).toBe(true);
  });
});

describe('formatGoalMoney', () => {
  it('formats a known currency without throwing', () => {
    expect(formatGoalMoney(49, 'USD')).toMatch(/49/);
  });
});
