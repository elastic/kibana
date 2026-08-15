/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { emptyPagesDailyStatus, emptyServiceDailyStatus } from '../../common/rum_daily';
import { resolveRumDaily } from './rum_daily';
import { weightedAverage } from './rum_daily_query';

const ready = (index: 'pages' | 'service') => ({
  ...(index === 'pages' ? emptyPagesDailyStatus() : emptyServiceDailyStatus()),
  installed: true,
  watermark: '2026-08-15T00:00:00.000Z',
  state: 'started' as const,
});

describe('resolveRumDaily', () => {
  it('uses daily rollups for long ranges when both are ready', () => {
    expect(
      resolveRumDaily({
        pagesDaily: ready('pages'),
        serviceDaily: ready('service'),
        rangeFrom: 'now-90d',
        rangeTo: 'now',
      })
    ).toEqual({ usePages: true, useService: true });
  });

  it('stays on raw for short ranges or extra filters', () => {
    expect(
      resolveRumDaily({
        pagesDaily: ready('pages'),
        serviceDaily: ready('service'),
        rangeFrom: 'now-24h',
        rangeTo: 'now',
      })
    ).toEqual({ usePages: false, useService: false });
    expect(
      resolveRumDaily({
        pagesDaily: ready('pages'),
        serviceDaily: ready('service'),
        rangeFrom: 'now-90d',
        rangeTo: 'now',
        browser: 'Chrome',
      })
    ).toEqual({ usePages: false, useService: false });
  });

  it('can use one rollup when the other is still warming', () => {
    expect(
      resolveRumDaily({
        pagesDaily: ready('pages'),
        serviceDaily: emptyServiceDailyStatus(),
        rangeFrom: 'now-90d',
        rangeTo: 'now',
      })
    ).toEqual({ usePages: true, useService: false });
  });
});

describe('weightedAverage', () => {
  it('weights daily p75s by sample count', () => {
    expect(
      weightedAverage([
        { value: 100, weight: 1 },
        { value: 400, weight: 3 },
      ])
    ).toBe(325);
  });

  it('ignores empty buckets', () => {
    expect(
      weightedAverage([
        { value: null, weight: 10 },
        { value: 50, weight: 0 },
      ])
    ).toBeNull();
  });
});
