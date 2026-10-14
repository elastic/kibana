/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useQuery } from '@kbn/react-query';
import { useFetchMaintenanceWindows } from './use_fetch_maintenance_windows';

jest.mock('@kbn/react-query', () => ({
  useQuery: jest.fn().mockReturnValue({ data: undefined, isLoading: false }),
}));

jest.mock('../../../utils/api_service', () => ({
  apiService: { get: jest.fn() },
}));

const useQueryMock = useQuery as jest.Mock;

describe('useFetchMaintenanceWindows', () => {
  afterEach(() => jest.clearAllMocks());

  it('sets staleTime equal to the refetch interval, so a component mount between polls does not trigger its own fetch', () => {
    // This hook is called per-card from the virtualized overview grid
    // (`MetricItemIcon` -> `useMonitorMWs`). Without a `staleTime` matching
    // `refetchInterval`, react-query's default `staleTime: 0` treats every
    // remount as needing a fresh fetch, so scrolling (which constantly
    // mounts new cards) fires a fetch per card instead of sharing the one
    // already-cached result.
    renderHook(() => useFetchMaintenanceWindows());

    const options = useQueryMock.mock.calls[0][2];
    expect(options.staleTime).toBe(options.refetchInterval);
    expect(options.staleTime).toBeGreaterThan(0);
  });
});
