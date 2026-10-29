/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { QueryClient } from '@kbn/react-query';
import type { SignificantEvent } from '@kbn/significant-events-schema';
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
    status: 'active',
    source_ids: ['service-a'],
    title: 'Event',
    summary: 'Summary',
    severity: 'medium',
    confidence: 0.9,
    ...overrides,
  } as SignificantEvent);

jest.mock('./use_kibana', () => ({
  useKibana: () => ({
    services: {
      application: {
        capabilities: {
          nightshift: {
            show: true,
          },
        },
      },
      significantEvents: {
        significantEventsRepositoryClient: { fetch: mockSignificantEventsFetch },
      },
    },
  }),
}));

let capturedQueryFn: ((args: { signal?: AbortSignal }) => Promise<unknown>) | undefined;

jest.mock('@kbn/react-query', () => ({
  useQuery: (params: {
    queryKey: readonly string[];
    queryFn: (args: { signal?: AbortSignal }) => Promise<unknown>;
  }) => {
    capturedQueryFn = params.queryFn;
    return {
      data: undefined,
      isLoading: true,
    };
  },
}));

describe('markEventInvestigationCompleteInCache', () => {
  beforeEach(() => {
    clearPendingInvestigationCompletionsForTests();
  });

  it('reapplies pending completed_at until a new round reuses the investigation id', async () => {
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
      setQueriesData: jest.fn(
        (
          { queryKey }: { queryKey: readonly string[] },
          updater: (
            current: NightshiftSignificantEventsQueryData | undefined
          ) => NightshiftSignificantEventsQueryData | undefined
        ) => {
          if (queryKey === NIGHTSHIFT_SIGNIFICANT_EVENTS_QUERY_KEY) {
            cache = updater(cache);
          }
        }
      ),
    } as unknown as QueryClient;

    markEventInvestigationCompleteInCache(queryClient, 'evt-1', '2026-01-01T00:05:00.000Z');

    mockSignificantEventsFetch.mockResolvedValueOnce({
      hits: [
        mockEvent({
          event_id: 'evt-1',
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

    mockSignificantEventsFetch.mockResolvedValueOnce({
      hits: [
        mockEvent({
          event_id: 'evt-1',
          investigations: [
            { workflow_execution_id: 'exec-1', started_at: '2026-01-01T01:00:00.000Z' },
          ],
        }),
      ],
      page: 1,
      perPage: 1,
      total: 1,
    });
    const nextRound = (await capturedQueryFn!({
      signal: undefined,
    })) as NightshiftSignificantEventsQueryData;

    expect(nextRound.hits[0].investigations?.[0].completed_at).toBeUndefined();
  });
});
