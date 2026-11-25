/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilterValue } from '../../../../../common/filter_values';
import type { OverviewFilterOptions } from '../../../../../common/overview_filters';
import { countSelectedValues, limitFilters, visibleFilters } from './overview_filters';

const include = (...values: string[]): FilterValue[] =>
  values.map((value) => ({ value, exclude: false }));

const NAMES = ['browser', 'os', 'appVersion', 'country', 'pageUrl'] as const;

describe('limitFilters', () => {
  it('keeps the most important filters, in order, up to the count', () => {
    expect(limitFilters(NAMES, {}, 2)).toEqual(['browser', 'os']);
    expect(limitFilters(NAMES, {}, 3)).toEqual(['browser', 'os', 'appVersion']);
    expect(limitFilters(NAMES, {}, 5)).toEqual([...NAMES]);
  });

  it('keeps none without room', () => {
    expect(limitFilters(NAMES, {}, 0)).toEqual([]);
    expect(limitFilters(NAMES, {}, -1)).toEqual([]);
  });

  it('gives a filter with a selection a place before the more important ones, in its own order', () => {
    expect(limitFilters(NAMES, { pageUrl: include('/cart') }, 1)).toEqual(['pageUrl']);
    expect(limitFilters(NAMES, { pageUrl: include('/cart') }, 2)).toEqual(['browser', 'pageUrl']);
  });

  it('gives the filters with a selection the places first', () => {
    expect(limitFilters(NAMES, { os: include('macOS'), country: include('DE') }, 3)).toEqual([
      'browser',
      'os',
      'country',
    ]);
    expect(limitFilters(NAMES, { os: include('macOS'), country: include('DE') }, 2)).toEqual([
      'os',
      'country',
    ]);
  });

  it('leaves out a filter with a selection too when there is no room, as its pill shows it', () => {
    expect(limitFilters(NAMES, { browser: include('Chrome'), os: include('macOS') }, 1)).toEqual([
      'browser',
    ]);
    expect(limitFilters(NAMES, { browser: include('Chrome') }, 0)).toEqual([]);
  });

  it('treats a filter with no values as not selected', () => {
    expect(limitFilters(NAMES, { browser: [] }, 1)).toEqual(['browser']);
    expect(limitFilters(NAMES, { os: [] }, 1)).toEqual(['browser']);
  });
});

describe('visibleFilters', () => {
  const options = (values: Partial<Record<(typeof NAMES)[number] | 'device', string[]>>) =>
    Object.fromEntries(
      ['browser', 'os', 'device', 'country', 'appVersion', 'pageUrl', 'pageContains'].map(
        (name) => [
          name,
          (values[name as keyof typeof values] ?? []).map((key) => ({ key, count: 1 })),
        ]
      )
    ) as unknown as OverviewFilterOptions;

  it('shows every pinned filter until the first Overview has loaded', () => {
    expect(visibleFilters(undefined, {})).toEqual([...NAMES]);
  });

  it('shows the pinned filters with values, and leaves device to the flyout', () => {
    expect(
      visibleFilters(options({ browser: ['Chrome'], os: ['macOS'], device: ['iPhone'] }), {})
    ).toEqual(['browser', 'os']);
  });

  it('shows a pinned filter with a selection although it has no values', () => {
    expect(visibleFilters(options({ browser: ['Chrome'] }), { country: include('DE') })).toEqual([
      'browser',
      'country',
    ]);
  });
});

describe('countSelectedValues', () => {
  it('counts the values of all the filters', () => {
    expect(
      countSelectedValues({ browser: include('Chrome', 'Firefox'), device: include('iPhone') })
    ).toBe(3);
    expect(countSelectedValues({})).toBe(0);
  });
});
