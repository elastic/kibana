/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { SignificantEvent } from '@kbn/significant-events-schema';
import { useSignificantEventsList } from './use_significant_events_list';

const mockSignificantEventsFetch = jest.fn();

jest.mock('@kbn/data-plugin/common', () => ({
  getAbsoluteTimeRange: () => ({
    from: '2026-10-19T12:00:00.000Z',
    to: '2026-10-20T12:00:00.000Z',
  }),
}));
jest.mock('../../hooks/use_fetch_error_toast', () => ({
  useFetchErrorToast: () => jest.fn(),
}));
jest.mock('../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      significantEvents: {
        significantEventsRepositoryClient: { fetch: mockSignificantEventsFetch },
      },
    },
  }),
}));

interface SignificantEventsListData {
  hits: SignificantEvent[];
  page: number;
  perPage: number;
  total: number;
}

let capturedQueryFn: ((args: { signal?: AbortSignal }) => Promise<unknown>) | undefined;
let capturedRefetchInterval:
  | ((data: SignificantEventsListData | undefined) => number | false)
  | undefined;

jest.mock('@kbn/react-query', () => ({
  useQuery: (params: {
    queryFn: (args: { signal?: AbortSignal }) => Promise<unknown>;
    refetchInterval: (data: SignificantEventsListData | undefined) => number | false;
  }) => {
    capturedQueryFn = params.queryFn;
    capturedRefetchInterval = params.refetchInterval;
    return { data: undefined, isLoading: true };
  },
}));

const createEvent = (investigations?: SignificantEvent['investigations']): SignificantEvent =>
  ({
    '@timestamp': '2026-10-20T11:00:00.000Z',
    event_id: 'event-1',
    status: 'active',
    source_ids: ['source-1'],
    title: 'Latency increased',
    summary: 'Latency increased for checkout.',
    severity: 'high',
    confidence: 0.9,
    investigations,
  } as SignificantEvent);

describe('useSignificantEventsList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requests one page with the selected range and filters', async () => {
    mockSignificantEventsFetch.mockResolvedValue({ hits: [], page: 2, perPage: 25, total: 0 });
    renderHook(() =>
      useSignificantEventsList({
        from: 'now-24h',
        to: 'now',
        page: 2,
        perPage: 25,
        search: 'checkout',
        status: ['active', 'recovering'],
        severity: ['critical', 'high'],
        investigation: ['in_progress'],
        sortField: 'severity',
        sortOrder: 'desc',
      })
    );

    await capturedQueryFn!({ signal: undefined });

    expect(mockSignificantEventsFetch).toHaveBeenCalledWith(
      'GET /internal/significant_events/events',
      {
        params: {
          query: {
            from: '2026-10-19T12:00:00.000Z',
            to: '2026-10-20T12:00:00.000Z',
            page: 2,
            perPage: 25,
            search: 'checkout',
            status: ['active', 'recovering'],
            severity: ['critical', 'high'],
            investigation_state: ['in_progress'],
            sort_field: 'severity',
            sort_order: 'desc',
          },
        },
        signal: null,
      }
    );
  });

  it('polls only while a visible event has a running investigation', () => {
    renderHook(() =>
      useSignificantEventsList({
        from: 'now-24h',
        to: 'now',
        page: 1,
        perPage: 25,
        search: '',
        status: [],
        severity: [],
        investigation: [],
        sortField: 'severity',
        sortOrder: 'desc',
      })
    );

    const runningEvent = createEvent([
      {
        workflow_execution_id: 'investigation-1',
        started_at: '2026-10-20T11:05:00.000Z',
      },
    ]);
    const completedEvent = createEvent([
      {
        workflow_execution_id: 'investigation-1',
        started_at: '2026-10-20T11:05:00.000Z',
        completed_at: '2026-10-20T11:10:00.000Z',
      },
    ]);

    expect(
      capturedRefetchInterval?.({ hits: [runningEvent], page: 1, perPage: 25, total: 1 })
    ).toBe(5_000);
    expect(
      capturedRefetchInterval?.({ hits: [completedEvent], page: 1, perPage: 25, total: 1 })
    ).toBe(false);
  });
});
