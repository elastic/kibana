/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from '@kbn/rison';
import { FILTER_VALUE_CAP } from './filter_values';
import type { OverviewFilters } from './overview_filters';
import {
  encodeOverviewFilters,
  omitOverviewFilters,
  OVERVIEW_FILTERS_PARAM_MAX_LENGTH,
  overviewFiltersParamIssue,
  parseOverviewFiltersParam,
  readOverviewFilters,
  toKibanaFilters,
} from './overview_filters_param';

const include = (...values: string[]) => values.map((value) => ({ value, exclude: false }));
const exclude = (...values: string[]) => values.map((value) => ({ value, exclude: true }));

const phrases = (key: string, params: string[], negate = false) => ({
  meta: { key, type: 'phrases', params, negate },
});
const phrase = (key: string, query: string, negate = false) => ({
  meta: { key, type: 'phrase', params: { query }, negate },
});

describe('toKibanaFilters', () => {
  it('has no filter for no values', () => {
    expect(toKibanaFilters({})).toEqual([]);
    expect(toKibanaFilters({ browser: [] })).toEqual([]);
  });

  it('writes one value as a phrase filter and several as a phrases filter', () => {
    expect(toKibanaFilters({ browser: include('Chrome'), os: include('macOS', 'iOS') })).toEqual([
      {
        meta: {
          key: 'browser',
          type: 'phrase',
          params: { query: 'Chrome' },
          negate: false,
          disabled: false,
          alias: null,
        },
      },
      {
        meta: {
          key: 'os',
          type: 'phrases',
          params: ['macOS', 'iOS'],
          negate: false,
          disabled: false,
          alias: null,
        },
      },
    ]);
  });

  it('writes the excluded values of a filter as negated filters, after the included ones', () => {
    const filters = toKibanaFilters({ browser: [...exclude('Safari'), ...include('Chrome')] });

    expect(filters.map(({ meta: { params, negate } }) => ({ params, negate }))).toEqual([
      { params: { query: 'Chrome' }, negate: false },
      { params: { query: 'Safari' }, negate: true },
    ]);
  });
});

describe('encodeOverviewFilters', () => {
  it('leaves the param out for no values', () => {
    expect(encodeOverviewFilters({})).toBeUndefined();
    expect(encodeOverviewFilters({ browser: [] })).toBeUndefined();
  });

  it('round-trips the values of every filter, whatever characters they hold', () => {
    const filters: OverviewFilters = {
      browser: [...include('Chrome', 'Mobile Safari'), ...exclude('Firefox')],
      os: include('macOS'),
      device: exclude('!bang', "it's, a (device)"),
      country: include('DE'),
      appVersion: [...include('1.3.0'), ...exclude('1.2.0-beta (rc,1)')],
      pageUrl: [...include('https://shop.example.com/a,b?q=!x&y=\\'), ...exclude('/health')],
      pageContains: [...include('/checkout?step=2'), ...exclude('admin')],
    };

    expect(readOverviewFilters(encodeOverviewFilters(filters))).toEqual(filters);
  });
});

describe('parseOverviewFiltersParam', () => {
  it('reads the values of phrase and phrases filters, negated ones as excluded', () => {
    const raw = encode([
      phrases('browser', ['Chrome', 'Safari']),
      phrase('browser', 'Firefox', true),
      phrase('country', 'DE'),
    ]);

    expect(parseOverviewFiltersParam(raw)).toEqual({
      filters: {
        browser: [...include('Chrome', 'Safari'), ...exclude('Firefox')],
        country: include('DE'),
      },
    });
  });

  it('ignores what a filter carries besides its meta, like a query a client wrote', () => {
    const raw = encode([
      { ...phrase('browser', 'Chrome'), query: { match_all: {} }, $state: { store: 'appState' } },
    ]);

    expect(parseOverviewFiltersParam(raw)).toEqual({ filters: { browser: include('Chrome') } });
  });

  it('takes the filters of one filter name from several filters', () => {
    const raw = encode([phrase('os', 'macOS'), phrase('os', 'iOS')]);

    expect(parseOverviewFiltersParam(raw)).toEqual({ filters: { os: include('macOS', 'iOS') } });
  });

  it.each([
    ['not rison', '(('],
    ['not a list', encode({ meta: { key: 'browser' } })],
    ['a filter on another field', encode([phrase('user.email', 'a@b.c')])],
    ['a filter of another type', encode([{ meta: { key: 'browser', type: 'exists' } }])],
    [
      'a disabled filter',
      encode([{ meta: { ...phrase('browser', 'Chrome').meta, disabled: true } }]),
    ],
    [
      'a negate that is not a boolean',
      encode([{ meta: { ...phrase('browser', 'a').meta, negate: 1 } }]),
    ],
    [
      'a value that is not a string',
      encode([{ meta: { key: 'browser', type: 'phrases', params: [1] } }]),
    ],
    ['an empty value', encode([phrase('browser', '')])],
    ['a value too long for its filter', encode([phrase('country', 'x'.repeat(17))])],
    ['a value included twice', encode([phrases('browser', ['Chrome', 'Chrome'])])],
    [
      'a value included and excluded',
      encode([phrase('browser', 'Chrome'), phrase('browser', 'Chrome', true)]),
    ],
    [
      'more values than a filter takes',
      encode([
        phrases(
          'browser',
          Array.from({ length: FILTER_VALUE_CAP + 1 }, (_, index) => `b${index}`)
        ),
      ]),
    ],
    [
      'more filters than there can be',
      encode(Array.from({ length: 11 }, () => phrase('browser', 'Chrome'))),
    ],
    ['a param that is too long', `!(${'x'.repeat(OVERVIEW_FILTERS_PARAM_MAX_LENGTH)})`],
  ])('rejects %s, rather than repairing it', (_, raw) => {
    expect(parseOverviewFiltersParam(raw)).toEqual({ issue: expect.any(String) });
    expect(overviewFiltersParamIssue(raw)).toEqual(expect.any(String));
  });

  it('takes the most values a filter can have', () => {
    const values = Array.from({ length: FILTER_VALUE_CAP }, (_, index) => `b${index}`);

    expect(overviewFiltersParamIssue(encode([phrases('browser', values)]))).toBeUndefined();
  });

  it('takes a value as long as its filter allows', () => {
    expect(
      overviewFiltersParamIssue(encode([phrase('pageUrl', 'x'.repeat(1024))]))
    ).toBeUndefined();
    expect(overviewFiltersParamIssue(encode([phrase('pageUrl', 'x'.repeat(1025))]))).toEqual(
      expect.any(String)
    );
  });
});

describe('readOverviewFilters', () => {
  it('has no filters for an unset, empty or invalid param', () => {
    expect(readOverviewFilters(undefined)).toEqual({});
    expect(readOverviewFilters('')).toEqual({});
    expect(readOverviewFilters('((')).toEqual({});
  });
});

describe('omitOverviewFilters', () => {
  it('writes the param without the filters named, and leaves it out when none is left', () => {
    const raw = encodeOverviewFilters({ browser: include('Chrome'), pageUrl: include('/a') });

    expect(readOverviewFilters(omitOverviewFilters(raw, ['pageUrl']))).toEqual({
      browser: include('Chrome'),
    });
    expect(omitOverviewFilters(raw, ['pageUrl', 'browser'])).toBeUndefined();
    expect(omitOverviewFilters(undefined, ['pageUrl'])).toBeUndefined();
  });
});
