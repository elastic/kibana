/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import {
  useFetchInvestigationStatuses,
  NIGHTSHIFT_INVESTIGATION_STATUSES_QUERY_KEY,
} from './use_fetch_investigation_statuses';

const mockInvestigationsFetch = jest.fn();
let mockInvestigationsClient: { fetch: typeof mockInvestigationsFetch } | undefined = {
  fetch: mockInvestigationsFetch,
};

jest.mock('./use_kibana', () => ({
  useKibana: () => ({
    services: {
      nightshiftInvestigations: mockInvestigationsClient
        ? { investigationsClient: mockInvestigationsClient }
        : undefined,
    },
  }),
}));

let capturedQueryFn: ((args: { signal?: AbortSignal }) => Promise<unknown>) | undefined;
let capturedQueryKey: readonly unknown[] | undefined;
let capturedEnabled: boolean | undefined;
let capturedRefetchInterval: ((data?: unknown) => number | false) | undefined;

jest.mock('@kbn/react-query', () => ({
  useQuery: (params: {
    queryKey: readonly unknown[];
    enabled: boolean;
    queryFn: (args: { signal?: AbortSignal }) => Promise<unknown>;
    refetchInterval: (data?: unknown) => number | false;
  }) => {
    capturedQueryKey = params.queryKey;
    capturedEnabled = params.enabled;
    capturedQueryFn = params.queryFn;
    capturedRefetchInterval = params.refetchInterval;
    return { data: undefined, isFetched: false };
  },
}));

describe('useFetchInvestigationStatuses', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInvestigationsClient = { fetch: mockInvestigationsFetch };
    capturedQueryFn = undefined;
    capturedQueryKey = undefined;
    capturedEnabled = undefined;
    capturedRefetchInterval = undefined;
    mockInvestigationsFetch.mockResolvedValue({ statuses: {} });
  });

  it('keys query with sorted deduplicated ids', () => {
    renderHook(() => useFetchInvestigationStatuses(['inv-2', 'inv-1', 'inv-2']));
    expect(capturedQueryKey).toEqual([
      ...NIGHTSHIFT_INVESTIGATION_STATUSES_QUERY_KEY,
      ['inv-1', 'inv-2'],
    ]);
    expect(capturedEnabled).toBe(true);
  });

  it('stays disabled when ids array is empty', () => {
    renderHook(() => useFetchInvestigationStatuses([]));
    expect(capturedEnabled).toBe(false);
  });

  it('stays disabled when investigationsClient is missing', () => {
    mockInvestigationsClient = undefined;
    renderHook(() => useFetchInvestigationStatuses(['inv-1']));
    expect(capturedEnabled).toBe(false);
  });

  it('fetches statuses and maps them to InvestigationRunStatus', async () => {
    mockInvestigationsFetch.mockResolvedValue({
      statuses: {
        'inv-pending': 'pending',
        'inv-running': 'running',
        'inv-completed': 'completed',
        'inv-failed': 'failed',
        'inv-cancelled': 'cancelled',
      },
    });

    renderHook(() =>
      useFetchInvestigationStatuses([
        'inv-pending',
        'inv-running',
        'inv-completed',
        'inv-failed',
        'inv-cancelled',
      ])
    );

    const result = await capturedQueryFn!({ signal: undefined });

    expect(mockInvestigationsFetch).toHaveBeenCalledWith(
      'POST /internal/nightshift/investigations/_status',
      {
        params: {
          body: {
            investigation_ids: [
              'inv-cancelled',
              'inv-completed',
              'inv-failed',
              'inv-pending',
              'inv-running',
            ],
          },
        },
        signal: null,
      }
    );

    expect(result).toEqual({
      'inv-pending': 'pending',
      'inv-running': 'pending',
      'inv-completed': 'complete',
      'inv-failed': 'failed',
      'inv-cancelled': 'failed',
    });
  });

  it('polls at 5000ms while any status is pending', () => {
    renderHook(() => useFetchInvestigationStatuses(['inv-1']));

    expect(capturedRefetchInterval!({ 'inv-1': 'pending', 'inv-2': 'complete' })).toBe(5000);
    expect(capturedRefetchInterval!({ 'inv-1': 'complete', 'inv-2': 'failed' })).toBe(false);
    expect(capturedRefetchInterval!({})).toBe(false);
  });
});
