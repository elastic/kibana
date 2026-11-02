/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { SignificantEventResponse } from '@kbn/significant-events-schema';
import { EVENT_BY_ID_QUERY_KEY } from '../query_keys';
import { useFetchEventById } from './use_fetch_event_by_id';

const mockSignificantEventsFetch = jest.fn();

jest.mock('../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      significantEvents: {
        significantEventsRepositoryClient: { fetch: mockSignificantEventsFetch },
      },
    },
  }),
}));

const createPendingEvent = (): SignificantEventResponse => ({
  '@timestamp': new Date().toISOString(),
  created_at: new Date().toISOString(),
  event_id: 'event-1',
  status: 'active',
  source_ids: ['source-1'],
  title: 'Deep-linked event',
  summary: 'An event outside the current list page.',
  severity: 'high',
  confidence: 0.9,
  investigations: [
    { workflow_execution_id: 'investigation-1', started_at: new Date().toISOString() },
  ],
});

describe('useFetchEventById polling', () => {
  let queryClient: QueryClient;

  const renderQuery = ({ enabled = true }: { enabled?: boolean } = {}) => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return renderHook(() => useFetchEventById('event-1', { enabled }), { wrapper });
  };

  const advanceTime = async (milliseconds: number) => {
    await act(async () => {
      await jest.advanceTimersByTimeAsync(milliseconds);
    });
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-22T12:00:00.000Z'));
    mockSignificantEventsFetch.mockReset();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, cacheTime: Infinity } },
    });
  });

  afterEach(() => {
    cleanup();
    queryClient.clear();
    jest.useRealTimers();
  });

  it.each(['completed', 'failed'] as const)(
    'refetches a pending event and stops after its %s outcome arrives',
    async (outcome) => {
      const pending = createPendingEvent();
      const terminal: SignificantEventResponse = {
        ...pending,
        investigations: pending.investigations?.map((investigation) => ({
          ...investigation,
          completed_at: new Date().toISOString(),
          outcome,
        })),
      };
      mockSignificantEventsFetch
        .mockResolvedValueOnce({ hits: [pending] })
        .mockResolvedValue({ hits: [terminal] });
      const { result } = renderQuery();
      await waitFor(() => expect(result.current.data).toEqual(pending));

      await advanceTime(5_000);

      await waitFor(() => expect(result.current.data).toEqual(terminal));
      expect(mockSignificantEventsFetch).toHaveBeenCalledTimes(2);
      await advanceTime(10_000);
      expect(mockSignificantEventsFetch).toHaveBeenCalledTimes(2);
    }
  );

  it('stops polling at the cutoff without fabricating a terminal outcome', async () => {
    const pending = createPendingEvent();
    pending.investigations = pending.investigations?.map((investigation) => ({
      ...investigation,
      started_at: new Date(Date.now() - 65 * 60 * 1000 + 5_000).toISOString(),
    }));
    mockSignificantEventsFetch.mockResolvedValue({ hits: [pending] });
    const { result } = renderQuery();
    await waitFor(() => expect(result.current.data).toEqual(pending));

    await advanceTime(5_000);

    expect(mockSignificantEventsFetch).toHaveBeenCalledTimes(2);
    await advanceTime(10_000);
    expect(mockSignificantEventsFetch).toHaveBeenCalledTimes(2);
    expect(result.current.data).toEqual(pending);
  });

  it('does not poll an event whose pending investigation has already expired', async () => {
    const pending = createPendingEvent();
    pending.investigations = pending.investigations?.map((investigation) => ({
      ...investigation,
      started_at: new Date(Date.now() - 65 * 60 * 1000).toISOString(),
    }));
    mockSignificantEventsFetch.mockResolvedValue({ hits: [pending] });
    const { result } = renderQuery();
    await waitFor(() => expect(result.current.data).toEqual(pending));

    await advanceTime(10_000);

    expect(mockSignificantEventsFetch).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(pending);
  });

  it('does not poll a missing event', async () => {
    mockSignificantEventsFetch.mockResolvedValue({ hits: [] });
    const { result } = renderQuery();
    await waitFor(() => expect(result.current.data).toBeNull());

    await advanceTime(10_000);

    expect(mockSignificantEventsFetch).toHaveBeenCalledTimes(1);
  });

  it('does not poll cached pending data when the caller disables the query', async () => {
    const pending = createPendingEvent();
    queryClient.setQueryData([...EVENT_BY_ID_QUERY_KEY, 'event-1'], pending);
    const { result } = renderQuery({ enabled: false });

    await advanceTime(10_000);

    expect(result.current.data).toEqual(pending);
    expect(mockSignificantEventsFetch).not.toHaveBeenCalled();
  });
});
