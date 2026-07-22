/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { of, throwError } from 'rxjs';

import { useMatchedAlertsCount } from '.';

const mockSetQuery = jest.fn();

const mockUseQueryAlerts = jest.fn().mockReturnValue({
  data: null,
  loading: false,
  setQuery: mockSetQuery,
  response: '',
  request: '',
  refetch: null,
});

jest.mock('../../../../../../detections/containers/detection_engine/alerts/use_query', () => ({
  useQueryAlerts: (...args: unknown[]) => mockUseQueryAlerts(...args),
}));

const mockUseSignalIndex = jest.fn().mockReturnValue({
  signalIndexName: '.alerts-security.alerts-default',
});

jest.mock(
  '../../../../../../detections/containers/detection_engine/alerts/use_signal_index',
  () => ({
    useSignalIndex: () => mockUseSignalIndex(),
  })
);

const mockSearch = jest.fn();

jest.mock('../../../../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      data: {
        search: {
          search: mockSearch,
        },
      },
    },
  }),
}));

const defaultSettings = {
  end: 'now',
  filters: [],
  query: { language: 'kuery' as const, query: '' },
  size: 100,
  start: 'now-24h',
};

describe('useMatchedAlertsCount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetQuery.mockClear();
    mockUseQueryAlerts.mockReturnValue({
      data: null,
      loading: false,
      setQuery: mockSetQuery,
      response: '',
      request: '',
      refetch: null,
    });
    mockUseSignalIndex.mockReturnValue({
      signalIndexName: '.alerts-security.alerts-default',
    });
    mockSearch.mockReturnValue(of({ rawResponse: { values: [[95]] } }));
  });

  describe('custom query mode (no esqlQuery)', () => {
    it('returns null count when data is not available', () => {
      const { result } = renderHook(() => useMatchedAlertsCount({ settings: defaultSettings }));

      expect(result.current.count).toBeNull();
    });

    it('returns the count from total hits when data is available', () => {
      mockUseQueryAlerts.mockReturnValue({
        data: { hits: { total: { value: 95, relation: 'eq' } } },
        loading: false,
        setQuery: mockSetQuery,
        response: '',
        request: '',
        refetch: null,
      });

      const { result } = renderHook(() => useMatchedAlertsCount({ settings: defaultSettings }));

      expect(result.current.count).toBe(95);
    });

    it('caps the count at settings.size', () => {
      mockUseQueryAlerts.mockReturnValue({
        data: { hits: { total: { value: 500, relation: 'eq' } } },
        loading: false,
        setQuery: mockSetQuery,
        response: '',
        request: '',
        refetch: null,
      });

      const { result } = renderHook(() =>
        useMatchedAlertsCount({ settings: { ...defaultSettings, size: 200 } })
      );

      expect(result.current.count).toBe(200);
    });

    it('immediately applies the new size cap when settings.size changes, before the debounce fires', () => {
      // This test guards against a regression where the cap used debouncedSettings.size
      // instead of settings.size, causing "Preview matched alerts" to show a stale cap
      // (e.g. 1266) while the ES|QL LIMIT was already updated to the new size (e.g. 299).
      mockUseQueryAlerts.mockReturnValue({
        data: { hits: { total: { value: 1266, relation: 'eq' } } },
        loading: false,
        setQuery: mockSetQuery,
        response: '',
        request: '',
        refetch: null,
      });

      const { result, rerender } = renderHook(
        ({ settings }: { settings: typeof defaultSettings }) => useMatchedAlertsCount({ settings }),
        { initialProps: { settings: { ...defaultSettings, size: 1266 } } }
      );

      // Initial render: size 1266, totalHits 1266 → count 1266
      expect(result.current.count).toBe(1266);

      // User reduces the slider to 299; settings.size updates immediately
      rerender({ settings: { ...defaultSettings, size: 299 } });

      // The cap must reflect the new size immediately (not after the 300ms debounce)
      expect(result.current.count).toBe(299);
    });

    it('returns loading state from useQueryAlerts', () => {
      mockUseQueryAlerts.mockReturnValue({
        data: null,
        loading: true,
        setQuery: mockSetQuery,
        response: '',
        request: '',
        refetch: null,
      });

      const { result } = renderHook(() => useMatchedAlertsCount({ settings: defaultSettings }));

      expect(result.current.loading).toBe(true);
    });

    it('skips the DSL query when skip is true', () => {
      renderHook(() => useMatchedAlertsCount({ settings: defaultSettings, skip: true }));

      expect(mockUseQueryAlerts).toHaveBeenCalledWith(expect.objectContaining({ skip: true }));
    });

    it('does not skip the DSL query when skip is false', () => {
      renderHook(() => useMatchedAlertsCount({ settings: defaultSettings, skip: false }));

      expect(mockUseQueryAlerts).toHaveBeenCalledWith(expect.objectContaining({ skip: false }));
    });

    it('handles numeric total hits', () => {
      mockUseQueryAlerts.mockReturnValue({
        data: { hits: { total: 42 } },
        loading: false,
        setQuery: mockSetQuery,
        response: '',
        request: '',
        refetch: null,
      });

      const { result } = renderHook(() => useMatchedAlertsCount({ settings: defaultSettings }));

      expect(result.current.count).toBe(42);
    });

    it('builds the count query with time range and default alert filters', () => {
      renderHook(() => useMatchedAlertsCount({ settings: defaultSettings }));

      const queryArg = mockUseQueryAlerts.mock.calls[0][0].query;

      expect(queryArg).toMatchObject({
        size: 0,
        track_total_hits: true,
        query: {
          bool: {
            filter: expect.arrayContaining([
              {
                range: {
                  '@timestamp': {
                    gte: 'now-24h',
                    lte: 'now',
                  },
                },
              },
              {
                terms: {
                  'kibana.alert.workflow_status': ['open', 'acknowledged'],
                },
              },
            ]),
            must_not: expect.arrayContaining([
              {
                exists: {
                  field: 'kibana.alert.building_block_type',
                },
              },
            ]),
          },
        },
      });
    });

    it('skips the DSL query when esqlQuery is provided', () => {
      renderHook(() =>
        useMatchedAlertsCount({
          esqlQuery: 'FROM .alerts-security.alerts-default | LIMIT 100',
          settings: defaultSettings,
        })
      );

      expect(mockUseQueryAlerts).toHaveBeenCalledWith(expect.objectContaining({ skip: true }));
    });

    it('does not call data.search.search when esqlQuery is not provided', () => {
      renderHook(() => useMatchedAlertsCount({ settings: defaultSettings }));

      expect(mockSearch).not.toHaveBeenCalled();
    });

    it('does not skip the DSL query when signalIndexName is null', () => {
      mockUseSignalIndex.mockReturnValue({ signalIndexName: null });

      renderHook(() => useMatchedAlertsCount({ settings: defaultSettings, skip: false }));

      expect(mockUseQueryAlerts).toHaveBeenCalledWith(expect.objectContaining({ skip: false }));
    });

    it('syncs the count query to useQueryAlerts via setQuery', () => {
      renderHook(() => useMatchedAlertsCount({ settings: defaultSettings }));

      expect(mockSetQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          size: 0,
          track_total_hits: true,
        })
      );
    });
  });

  describe('ES|QL mode (esqlQuery provided)', () => {
    const esqlQuery = 'FROM .alerts-security.alerts-default | LIMIT 100';

    it('initializes useQueryAlerts with a valid count query even in ES|QL mode', () => {
      renderHook(() => useMatchedAlertsCount({ esqlQuery, settings: defaultSettings }));

      const queryArg = mockUseQueryAlerts.mock.calls[0][0].query;

      expect(queryArg).toMatchObject({
        size: 0,
        track_total_hits: true,
        query: expect.objectContaining({
          bool: expect.any(Object),
        }),
      });
    });

    it('returns the count from ES|QL query result', async () => {
      mockSearch.mockReturnValue(of({ rawResponse: { values: [[95]] } }));

      const { result } = renderHook(() =>
        useMatchedAlertsCount({ esqlQuery, settings: defaultSettings })
      );

      await act(async () => {});

      expect(result.current.count).toBe(95);
    });

    it('calls data.search.search with a count query appended', async () => {
      mockSearch.mockReturnValue(of({ rawResponse: { values: [[42]] } }));

      renderHook(() => useMatchedAlertsCount({ esqlQuery, settings: defaultSettings }));

      await act(async () => {});

      expect(mockSearch).toHaveBeenCalled();

      const searchParams = mockSearch.mock.calls[0][0].params;

      expect(searchParams.query).toContain('STATS total_count = count()');
    });

    it('uses the esql_async strategy', async () => {
      mockSearch.mockReturnValue(of({ rawResponse: { values: [[10]] } }));

      renderHook(() => useMatchedAlertsCount({ esqlQuery, settings: defaultSettings }));

      await act(async () => {});

      expect(mockSearch).toHaveBeenCalled();

      const searchOptions = mockSearch.mock.calls[0][1];

      expect(searchOptions.strategy).toBe('esql_async');
    });

    it('returns null count when the ES|QL query returns no values', async () => {
      mockSearch.mockReturnValue(of({ rawResponse: { values: [] } }));

      const { result } = renderHook(() =>
        useMatchedAlertsCount({ esqlQuery, settings: defaultSettings })
      );

      await act(async () => {});

      expect(result.current.count).toBeNull();
    });

    it('returns null count when the search fails', async () => {
      mockSearch.mockReturnValue(throwError(() => new Error('search error')));

      const { result } = renderHook(() =>
        useMatchedAlertsCount({ esqlQuery, settings: defaultSettings })
      );

      await act(async () => {});

      expect(result.current.count).toBeNull();
    });

    it('skips the ES|QL query when skip is true', async () => {
      renderHook(() => useMatchedAlertsCount({ esqlQuery, settings: defaultSettings, skip: true }));

      await act(async () => {});

      expect(mockSearch).not.toHaveBeenCalled();
    });

    it('resolves time range named params when query uses ?_tstart and ?_tend', async () => {
      const queryWithTimeParams =
        'FROM .alerts-security.alerts-default | WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend | LIMIT 100';
      mockSearch.mockReturnValue(of({ rawResponse: { values: [[50]] } }));

      renderHook(() =>
        useMatchedAlertsCount({
          esqlQuery: queryWithTimeParams,
          settings: defaultSettings,
        })
      );

      await act(async () => {});

      expect(mockSearch).toHaveBeenCalled();

      const searchParams = mockSearch.mock.calls[0][0].params;

      expect(searchParams.params).toBeDefined();
      expect(searchParams.params.length).toBeGreaterThan(0);
    });
  });
});
