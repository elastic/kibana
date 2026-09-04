/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { SignificantEvent } from '@kbn/significant-events-schema';
import { useFetchEventById } from './use_fetch_event_by_id';

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
    severity: '20-low',
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
let capturedQueryKey: readonly unknown[] | undefined;
let capturedEnabled: boolean | undefined;

jest.mock('@kbn/react-query', () => ({
  useQuery: (params: {
    queryKey: readonly unknown[];
    enabled: boolean;
    queryFn: (args: { signal?: AbortSignal }) => Promise<unknown>;
  }) => {
    capturedQueryKey = params.queryKey;
    capturedEnabled = params.enabled;
    capturedQueryFn = params.queryFn;
    return { data: undefined, isFetched: false };
  },
}));

describe('useFetchEventById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedQueryFn = undefined;
    capturedQueryKey = undefined;
    capturedEnabled = undefined;
    mockSignificantEventsFetch.mockResolvedValue({ hits: [], page: 1, perPage: 1, total: 0 });
  });

  it('requests the event by id and sends no list filters', async () => {
    renderHook(() => useFetchEventById('evt-1'));

    await capturedQueryFn!({ signal: undefined });

    expect(mockSignificantEventsFetch).toHaveBeenCalledWith(
      'GET /internal/significant_events/events',
      {
        params: { query: { event_id: 'evt-1', page: 1, perPage: 1 } },
        signal: null,
      }
    );
  });

  it('keys the query by event id', () => {
    renderHook(() => useFetchEventById('evt-1'));

    expect(capturedQueryKey).toEqual(['nightshift.eventById', 'evt-1']);
  });

  it('resolves to the first hit', async () => {
    const event = mockEvent({ event_id: 'evt-low' });
    mockSignificantEventsFetch.mockResolvedValue({
      hits: [event],
      page: 1,
      perPage: 1,
      total: 1,
    });

    renderHook(() => useFetchEventById('evt-low'));

    await expect(capturedQueryFn!({ signal: undefined })).resolves.toEqual(event);
  });

  it('resolves to null (never undefined, which react-query rejects) when the event does not exist', async () => {
    renderHook(() => useFetchEventById('evt-unknown'));

    await expect(capturedQueryFn!({ signal: undefined })).resolves.toBeNull();
  });

  it('stays disabled without an event id', () => {
    renderHook(() => useFetchEventById(undefined));

    expect(capturedEnabled).toBe(false);
  });

  it('stays disabled when the caller disables it', () => {
    renderHook(() => useFetchEventById('evt-1', { enabled: false }));

    expect(capturedEnabled).toBe(false);
  });
});
