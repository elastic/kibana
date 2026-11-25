/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useEsSearch } from '@kbn/observability-shared-plugin/public';
import { HAS_RUM_DATA_TIERS } from '../../../../services/data/has_rum_data_query';
import { useDataView } from '../local_uifilters/use_data_view';
import { useHasRumData } from './use_has_rum_data';

jest.mock('@kbn/observability-shared-plugin/public', () => ({
  useEsSearch: jest.fn(),
}));

jest.mock('../local_uifilters/use_data_view', () => ({
  useDataView: jest.fn(),
}));

const TIERED = 'UXHasRumDataInHotOrWarmTiers';
const UNBOUNDED = 'UXHasRumDataUnbounded';
const DATA_VIEW_TITLE = 'apm-*';
const TIER_CLAUSE = { terms: { _tier: HAS_RUM_DATA_TIERS } };

const hasRangeClause = (filter: unknown[]) =>
  filter.some((clause) => typeof clause === 'object' && clause !== null && 'range' in clause);

interface EsSearchResult {
  data?: unknown;
  loading: boolean;
  error?: Error;
}

const useEsSearchMock = useEsSearch as jest.Mock;
const useDataViewMock = useDataView as jest.Mock;

const hits = (value: number) => ({
  hits: { total: { value, relation: 'eq' } },
  aggregations: { services: { mostTraffic: { buckets: [{ key: 'client' }] } } },
});

/** Responses keyed by request name, so tests never depend on hook call order. */
let responses: Record<string, EsSearchResult>;
let calls: Array<{
  name: string;
  params: {
    index?: string;
    query: { bool: { filter: unknown[] } };
    aggs?: unknown;
    terminate_after?: number;
    track_total_hits?: number;
  };
}>;

const callFor = (name: string) => calls.filter((call) => call.name === name).pop();

beforeEach(() => {
  responses = {};
  calls = [];
  window.localStorage.clear();

  useDataViewMock.mockReturnValue({ dataViewTitle: DATA_VIEW_TITLE });

  useEsSearchMock.mockImplementation((params, _deps, options) => {
    calls.push({ name: options.name, params });

    // An explicit response always wins, so a test can reproduce the render where a request is
    // enabled but its effect has not run yet (`loading: false` with no data).
    return responses[options.name] ?? { data: undefined, loading: Boolean(params.index) };
  });
});

afterEach(() => {
  window.localStorage.clear();
  jest.clearAllMocks();
});

describe('useHasRumData', () => {
  it('answers from the tier restricted query alone when data exists in hot or warm', () => {
    responses[TIERED] = { data: hits(1), loading: false };

    const { result } = renderHook(() => useHasRumData());

    expect(result.current.hasData).toBe(true);
    expect(result.current.loading).toBe(false);
    const tieredParams = callFor(TIERED)?.params;
    expect(tieredParams?.query.bool.filter).toContainEqual(TIER_CLAUSE);
    expect(hasRangeClause(tieredParams?.query.bool.filter ?? [])).toBe(true);
    expect(tieredParams).not.toHaveProperty('aggs');
    expect(tieredParams?.terminate_after).toBe(1);
    // No second request: `useEsSearch` skips it while `index` is undefined.
    expect(callFor(UNBOUNDED)?.params.index).toBeUndefined();
    expect(window.localStorage.getItem('uxAppHasDataBoolean')).toBe('true');
  });

  it('falls back to the unrestricted query when the tier restricted one is empty', () => {
    responses[TIERED] = { data: hits(0), loading: false };
    responses[UNBOUNDED] = { data: hits(1), loading: false };

    const { result } = renderHook(() => useHasRumData());

    const fallback = callFor(UNBOUNDED);
    expect(fallback?.params.index).toBe(DATA_VIEW_TITLE);
    expect(fallback?.params.query.bool.filter).not.toContainEqual(TIER_CLAUSE);
    // Unbounded in time as well as tier, so data older than the cheap pass's lookback still counts.
    expect(hasRangeClause(fallback?.params.query.bool.filter ?? [])).toBe(false);
    expect(fallback?.params).not.toHaveProperty('aggs');
    expect(fallback?.params.terminate_after).toBe(1);
    expect(result.current.hasData).toBe(true);
    expect(window.localStorage.getItem('uxAppHasDataBoolean')).toBe('true');
  });

  it('stays loading while the fallback is pending, so the onboarding screen never flashes', () => {
    responses[TIERED] = { data: undefined, loading: true };

    const { result, rerender } = renderHook(() => useHasRumData());
    const observations = [{ ...result.current }];

    // The tier restricted query settles empty. The fallback is enabled on this render but its
    // effect has not run, so `useEsSearch` still reports `loading: false` with no data.
    responses[TIERED] = { data: hits(0), loading: false };
    responses[UNBOUNDED] = { data: undefined, loading: false };
    rerender();
    observations.push({ ...result.current });

    responses[UNBOUNDED] = { data: undefined, loading: true };
    rerender();
    observations.push({ ...result.current });

    responses[UNBOUNDED] = { data: hits(1), loading: false };
    rerender();
    observations.push({ ...result.current });

    expect(observations[1].loading).toBe(true);
    expect(observations.slice(0, -1).every(({ loading }) => loading)).toBe(true);
    expect(observations.filter(({ loading, hasData }) => !loading && !hasData)).toHaveLength(0);
    expect(result.current.hasData).toBe(true);
    expect(result.current.loading).toBe(false);
  });

  it('does not return to the loading screen once an answer exists', () => {
    // Either query can be re-issued when its dependencies settle. Before this was handled, the
    // page went onboarding -> loading -> onboarding, which reads as a flicker.
    responses[TIERED] = { data: hits(0), loading: false };
    responses[UNBOUNDED] = { data: hits(0), loading: false };

    const { result, rerender } = renderHook(() => useHasRumData());
    expect(result.current).toMatchObject({ hasData: false, loading: false });

    // the tier restricted query re-fires
    responses[TIERED] = { data: hits(0), loading: true };
    rerender();

    expect(result.current.loading).toBe(false);
    expect(result.current.hasData).toBe(false);
  });

  it('never shows the loading screen when an earlier visit already answered', () => {
    // The check costs two sequential requests on the no-data path. Spinning for both of them is
    // what made the loading screen visible; a returning user keeps the previous answer instead.
    window.localStorage.setItem('uxAppHasDataBoolean', 'false');
    responses[TIERED] = { data: undefined, loading: true };

    const { result } = renderHook(() => useHasRumData());

    expect(result.current.loading).toBe(false);
    expect(result.current.hasData).toBe(false);
  });

  it('keeps the fallback enabled when the tier restricted query is re-issued', () => {
    // The tier restricted query can be re-issued while the fallback is still in flight. If that
    // disables the fallback, the stale empty tiered result becomes the answer and the onboarding
    // screen is shown to a user who does have data, just on a colder tier.
    responses[TIERED] = { data: hits(0), loading: false };
    responses[UNBOUNDED] = { data: undefined, loading: true };

    const { result, rerender } = renderHook(() => useHasRumData());
    expect(callFor(UNBOUNDED)?.params.index).toBe(DATA_VIEW_TITLE);

    // the tier restricted query starts over
    responses[TIERED] = { data: hits(0), loading: true };
    rerender();

    expect(callFor(UNBOUNDED)?.params.index).toBe(DATA_VIEW_TITLE);
    expect(result.current.hasData).toBe(false);
    expect(result.current.loading).toBe(true);

    // ...and the fallback finally answers
    responses[TIERED] = { data: hits(0), loading: false };
    responses[UNBOUNDED] = { data: hits(20), loading: false };
    rerender();

    expect(result.current.hasData).toBe(true);
    expect(result.current.loading).toBe(false);
  });

  it('reports no data when neither query finds any', () => {
    responses[TIERED] = { data: hits(0), loading: false };
    responses[UNBOUNDED] = { data: hits(0), loading: false };

    const { result } = renderHook(() => useHasRumData());

    expect(result.current.hasData).toBe(false);
    expect(result.current.loading).toBe(false);
    expect(window.localStorage.getItem('uxAppHasDataBoolean')).toBe('false');
  });

  it('keeps the cached answer and stops loading when the fallback fails', () => {
    window.localStorage.setItem('uxAppHasDataBoolean', 'true');
    responses[TIERED] = { data: hits(0), loading: false };
    responses[UNBOUNDED] = { data: undefined, loading: false, error: new Error('boom') };

    const { result } = renderHook(() => useHasRumData());

    expect(result.current.loading).toBe(false);
    expect(result.current.hasData).toBe(true);
    // A failed request must never overwrite a known-good answer with `false`.
    expect(window.localStorage.getItem('uxAppHasDataBoolean')).toBe('true');
  });

  it('stops loading when both queries fail, and leaves the cache untouched', () => {
    // Neither pass can answer, so there is nothing to wait for and nothing worth caching. Staying
    // on the loading screen here would hang the app on a cluster that cannot serve the check.
    responses[TIERED] = { data: undefined, loading: false, error: new Error('boom') };
    responses[UNBOUNDED] = { data: undefined, loading: false, error: new Error('boom') };

    const { result } = renderHook(() => useHasRumData());

    expect(result.current.loading).toBe(false);
    expect(result.current.hasData).toBe(false);
    expect(window.localStorage.getItem('uxAppHasDataBoolean')).toBeNull();
  });

  it('issues no request until the data view is known', () => {
    useDataViewMock.mockReturnValue({ dataViewTitle: '' });

    const { result } = renderHook(() => useHasRumData());

    expect(calls.every(({ params }) => !params.index)).toBe(true);
    expect(result.current.loading).toBe(false);
  });

  it('falls back when the tier restricted query errors, instead of keeping a stale cache with no retry', () => {
    window.localStorage.setItem('uxAppHasDataBoolean', 'false');
    responses[TIERED] = { data: undefined, loading: false, error: new Error('boom') };
    responses[UNBOUNDED] = { data: hits(1), loading: false };

    const { result } = renderHook(() => useHasRumData());

    expect(callFor(UNBOUNDED)?.params.index).toBe(DATA_VIEW_TITLE);
    expect(result.current.hasData).toBe(true);
    expect(window.localStorage.getItem('uxAppHasDataBoolean')).toBe('true');
  });

  it('clears the fallback latch when the tier restricted query later finds data', () => {
    responses[TIERED] = { data: hits(0), loading: false };
    responses[UNBOUNDED] = { data: hits(1), loading: false };

    const { result, rerender } = renderHook(() => useHasRumData());
    expect(callFor(UNBOUNDED)?.params.index).toBe(DATA_VIEW_TITLE);

    responses[TIERED] = { data: hits(3), loading: false };
    rerender();

    expect(callFor(UNBOUNDED)?.params.index).toBeUndefined();
    expect(result.current.hasData).toBe(true);
  });

  it('does not re-enable the fallback before the cheap pass answers after changing data view', () => {
    responses[TIERED] = { data: hits(0), loading: false };
    responses[UNBOUNDED] = { data: hits(1), loading: false };

    const { rerender } = renderHook(() => useHasRumData());
    expect(callFor(UNBOUNDED)?.params.index).toBe(DATA_VIEW_TITLE);

    useDataViewMock.mockReturnValue({ dataViewTitle: 'traces-*' });
    responses[TIERED] = { data: undefined, loading: true };
    responses[UNBOUNDED] = { data: undefined, loading: false };
    rerender();

    expect(callFor(UNBOUNDED)?.params.index).toBeUndefined();

    responses[TIERED] = { data: hits(4), loading: false };
    rerender();

    expect(callFor(UNBOUNDED)?.params.index).toBeUndefined();
  });
});
