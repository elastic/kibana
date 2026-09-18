/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useOverviewAlertsCount } from './use_overview_alerts_count';
import * as paramHook from '../../../hooks/use_url_params';
import * as filtersHook from './use_monitor_filters';
import * as spaceHook from '../../../../../hooks/use_kibana_space';

const mockHttpPost = jest.fn();
// Stable across renders — a fresh object per call would change `http`'s
// identity every render, defeating `useAsyncFn`'s deps array and causing an
// infinite refetch loop (the effect that calls `refetch` never settles).
const mockServices = { services: { http: { post: mockHttpPost } } };

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => mockServices,
}));

const bucketsResponse = (buckets: Array<{ key: string; doc_count: number }>) => ({
  aggregations: { count: { buckets } },
});

describe('useOverviewAlertsCount', () => {
  const paramSpy = jest.spyOn(paramHook, 'useGetUrlParams');
  const filtersSpy = jest.spyOn(filtersHook, 'useMonitorFilters');
  const spaceSpy = jest.spyOn(spaceHook, 'useKibanaSpace');

  beforeEach(() => {
    jest.clearAllMocks();
    filtersSpy.mockReturnValue([]);
    paramSpy.mockReturnValue({} as any);
    spaceSpy.mockReturnValue({ loading: false } as any);
    mockHttpPost.mockResolvedValue(bucketsResponse([]));
  });

  const props = { from: 'now-12h', to: 'now' };

  it('starts in a loading state', async () => {
    const { result } = renderHook(() => useOverviewAlertsCount(props));

    expect(result.current.loading).toBe(true);

    // Let the in-flight request settle before the test ends, so its state
    // update doesn't land — and warn — after teardown.
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('sums only the active and recovered buckets, ignoring other statuses', async () => {
    mockHttpPost.mockResolvedValue(
      bucketsResponse([
        { key: 'active', doc_count: 2 },
        { key: 'recovered', doc_count: 3 },
        { key: 'untracked', doc_count: 10 },
      ])
    );

    const { result } = renderHook(() => useOverviewAlertsCount(props));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.count).toEqual(5);
    expect(result.current.error).toBeUndefined();
  });

  it('reports the error and does not substitute a misleading zero count', async () => {
    mockHttpPost.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useOverviewAlertsCount(props));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('scopes the query to the given date range, monitor filters, and locations', async () => {
    filtersSpy.mockReturnValue([{ field: 'kibana.space_ids', values: ['default'] }]);
    paramSpy.mockReturnValue({ locations: ['us-east'] } as any);

    renderHook(() => useOverviewAlertsCount(props));

    await waitFor(() => expect(mockHttpPost).toHaveBeenCalled());

    const [, requestArgs] = mockHttpPost.mock.calls[0];
    const body = JSON.parse(requestArgs.body);

    expect(body.query.bool.filter).toEqual(
      expect.arrayContaining([
        { range: { '@timestamp': { gte: 'now-12h', lte: 'now' } } },
        { terms: { 'kibana.space_ids': ['default'] } },
        { terms: { 'observer.geo.name': ['us-east'] } },
      ])
    );
  });

  it('does not query until the active space resolves, so it never runs unscoped by space', async () => {
    // Spaces are a security boundary for alert data — `alertsFilters` omits
    // `kibana.space_ids` until the space resolves, so firing before that
    // would transiently expose alert counts from every space.
    spaceSpy.mockReturnValue({ loading: true } as any);

    const { result } = renderHook(() => useOverviewAlertsCount(props));

    expect(result.current.loading).toBe(true);
    expect(mockHttpPost).not.toHaveBeenCalled();
  });

  it('quotes and escapes the free-text search query rather than passing it through as raw Lucene syntax', async () => {
    paramSpy.mockReturnValue({ query: 'a" OR monitor.name: *' } as any);

    renderHook(() => useOverviewAlertsCount(props));

    await waitFor(() => expect(mockHttpPost).toHaveBeenCalled());

    const [, requestArgs] = mockHttpPost.mock.calls[0];
    const body = JSON.parse(requestArgs.body);

    expect(body.query.bool.filter).toEqual(
      expect.arrayContaining([
        {
          query_string: {
            query: '"a\\" OR monitor.name: *"',
            fields: ['monitor.name'],
          },
        },
      ])
    );
  });
});
