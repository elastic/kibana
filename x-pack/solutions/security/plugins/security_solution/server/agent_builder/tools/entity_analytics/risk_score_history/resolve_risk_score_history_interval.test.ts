/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { resolveSimpleRiskScoreHistoryInterval } from './resolve_risk_score_history_interval';

describe('resolveSimpleRiskScoreHistoryInterval', () => {
  it('floors sub-hour / empty ranges to 1h', () => {
    const min = moment('2026-01-01T00:00:00.000Z');
    expect(resolveSimpleRiskScoreHistoryInterval({ min, max: min })).toEqual({
      value: 1,
      unit: 'h',
    });
  });

  it('picks 1d for the default 90d chat lookback', () => {
    const max = moment('2026-04-01T00:00:00.000Z');
    const min = moment(max).subtract(90, 'days');
    expect(resolveSimpleRiskScoreHistoryInterval({ min, max })).toEqual({
      value: 1,
      unit: 'd',
    });
  });

  it('picks 1h for a 24h range', () => {
    const max = moment('2026-04-01T00:00:00.000Z');
    const min = moment(max).subtract(24, 'hours');
    expect(resolveSimpleRiskScoreHistoryInterval({ min, max })).toEqual({
      value: 1,
      unit: 'h',
    });
  });

  it('coarsens to 1w when a daily series would exceed the bucket target', () => {
    const max = moment('2026-04-01T00:00:00.000Z');
    const min = moment(max).subtract(180, 'days');
    expect(resolveSimpleRiskScoreHistoryInterval({ min, max })).toEqual({
      value: 1,
      unit: 'w',
    });
  });
});
