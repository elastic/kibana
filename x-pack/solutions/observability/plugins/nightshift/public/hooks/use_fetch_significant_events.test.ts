/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { QueryClient } from '@kbn/react-query';
import type { SignificantEvent } from '@kbn/significant-events-schema';
import { NIGHTSHIFT_LANDING_SEVERITIES } from '../common/constants';
import {
  clearPendingInvestigationCompletionsForTests,
  markEventInvestigationCompleteInCache,
  NIGHTSHIFT_SIGNIFICANT_EVENTS_QUERY_KEY,
  useFetchSignificantEvents,
  type NightshiftSignificantEventsQueryData,
} from './use_fetch_significant_events';

const mockSignificantEventsFetch = jest.fn();

const mockEvent = (overrides: Partial<SignificantEvent> = {}): SignificantEvent =>
  ({
    '@timestamp': '2026-01-01T00:00:00.000Z',
    event_id: 'evt-1',
    event_uuid: 'evt-uuid-1',
    status: 'open',
    stream_names: ['service-a'],
    title: 'Event',
    summary: 'Summary',
    severity: '40-medium',
    confidence: 0.9,
    ...overrides,
  } as SignificantEvent);

jest.mock('./use_kibana', () => ({
  useKibana: () => ({
    services: {
      significantEvents: {
        significantEventsRepositoryClient: { fetch: mockSignificantEventsFetch },
      },
    },
  }),
}));

let capturedQueryFn: ((args: { signal?: AbortSignal }) => Promise<unknown>) | undefined;
let capturedRefetchInterval:
  | ((data: NightshiftSignificantEventsQueryData | undefined) => number | false)
  | undefined;

jest.mock('@kbn/react-query', () => ({
  useQuery: (params: {
    queryKey: readonly string[];
    queryFn: (args: { signal?: AbortSignal }) => Promise<unknown>;
    refetchInterval: (data: NightshiftSignificantEventsQueryData | undefined) => number | false;
  }) => {
    capturedQueryFn = params.queryFn;
    capturedRefetchInterval = params.refetchInterval;
    return {
      data: undefined,
      isLoading: true,
    };
  },
}));

describe('useFetchSignificantEvents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearPendingInvestigationCompletionsForTests();
    mockSignificantEventsFetch.mockResolvedValue({
      hits: [],
      page: 1,
      perPage: 1000,
      total: 0,
    });
  });

  it('requests critical and high-severity events for the landing page', async () => {
    renderHook(() => useFetchSignificantEvents());

    await capturedQueryFn!({ signal: undefined });

    expect(mockSignificantEventsFetch).toHaveBeenCalledWith(
      'GET /internal/significant_events/events',
      expect.objectContaining({
        params: {
          query: expect.objectContaining({
            severity: NIGHTSHIFT_LANDING_SEVERITIES,
          }),
        },
      })
    );
  });

  it('polls while an investigation is running', () => {
    renderHook(() => useFetchSignificantEvents());

    const runningEvent = mockEvent({
      investigations: [
        {
          workflow_execution_id: 'exec-1',
          started_at: '2026-01-01T00:00:00.000Z',
        },
      ],
    });

    expect(
      capturedRefetchInterval?.({
        hits: [runningEvent],
        page: 1,
        perPage: 1,
        total: 1,
      })
    ).toBe(5_000);
  });
});

describe('markEventInvestigationCompleteInCache', () => {
  beforeEach(() => {
    clearPendingInvestigationCompletionsForTests();
  });

  it('sets completed_at on the matching event latest investigation', () => {
    let cache: NightshiftSignificantEventsQueryData | undefined = {
      hits: [
        mockEvent({
          investigations: [
            {
              workflow_execution_id: 'exec-1',
              started_at: '2026-01-01T00:00:00.000Z',
            },
          ],
        }),
      ],
      page: 1,
      perPage: 1,
      total: 1,
    };
    const queryClient = {
      setQueryData: jest.fn(
        (
          queryKey: typeof NIGHTSHIFT_SIGNIFICANT_EVENTS_QUERY_KEY,
          updater: (
            current: NightshiftSignificantEventsQueryData | undefined
          ) => NightshiftSignificantEventsQueryData | undefined
        ) => {
          expect(queryKey).toEqual(NIGHTSHIFT_SIGNIFICANT_EVENTS_QUERY_KEY);
          cache = updater(cache);
        }
      ),
    } as unknown as QueryClient;

    markEventInvestigationCompleteInCache(queryClient, 'evt-uuid-1', '2026-01-01T00:05:00.000Z');

    expect(cache?.hits[0].investigations?.[0].completed_at).toBe('2026-01-01T00:05:00.000Z');
  });

  it('reapplies pending completed_at after a refetch still missing server completion', async () => {
    let cache: NightshiftSignificantEventsQueryData | undefined = {
      hits: [
        mockEvent({
          investigations: [
            {
              workflow_execution_id: 'exec-1',
              started_at: '2026-01-01T00:00:00.000Z',
            },
          ],
        }),
      ],
      page: 1,
      perPage: 1,
      total: 1,
    };
    const queryClient = {
      setQueryData: jest.fn(
        (
          _queryKey: typeof NIGHTSHIFT_SIGNIFICANT_EVENTS_QUERY_KEY,
          updater: (
            current: NightshiftSignificantEventsQueryData | undefined
          ) => NightshiftSignificantEventsQueryData | undefined
        ) => {
          cache = updater(cache);
        }
      ),
    } as unknown as QueryClient;

    markEventInvestigationCompleteInCache(queryClient, 'evt-uuid-1', '2026-01-01T00:05:00.000Z');

    mockSignificantEventsFetch.mockResolvedValueOnce({
      hits: [
        mockEvent({
          event_uuid: 'evt-uuid-2',
          investigations: [
            {
              workflow_execution_id: 'exec-1',
              started_at: '2026-01-01T00:00:00.000Z',
            },
          ],
        }),
      ],
      page: 1,
      perPage: 1,
      total: 1,
    });

    renderHook(() => useFetchSignificantEvents());
    const data = (await capturedQueryFn!({
      signal: undefined,
    })) as NightshiftSignificantEventsQueryData;

    expect(data.hits[0].investigations?.[0].completed_at).toBe('2026-01-01T00:05:00.000Z');
  });
});
