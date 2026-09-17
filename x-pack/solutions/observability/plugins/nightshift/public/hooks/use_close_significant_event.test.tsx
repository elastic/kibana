/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { SignificantEvent } from '@kbn/significant-events-schema';
import { useKibana } from './use_kibana';
import {
  NIGHTSHIFT_SIGNIFICANT_EVENTS_QUERY_KEY,
  type NightshiftSignificantEventsQueryData,
} from './use_fetch_significant_events';
import { useCloseSignificantEvent } from './use_close_significant_event';

jest.mock('./use_kibana');

const mockUseKibana = useKibana as jest.Mock;
const significantEventsFetch = jest.fn();
const addSuccess = jest.fn();
const addError = jest.fn();

const event: SignificantEvent = {
  '@timestamp': '2026-07-24T09:42:00.000Z',
  event_id: 'event-1',
  event_uuid: 'event-1-v1',
  status: 'open',
  stream_names: ['logs.checkout'],
  title: 'Checkout latency',
  summary: 'Checkout latency increased.',
  severity: '80-critical',
  confidence: 0.94,
};

describe('useCloseSignificantEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    significantEventsFetch.mockResolvedValue({
      event_uuid: 'event-1-v2',
      updated: 1,
      ignored: 0,
      status: 'closed',
    });
    mockUseKibana.mockReturnValue({
      services: {
        notifications: {
          toasts: { addError, addSuccess },
        },
        significantEvents: {
          significantEventsRepositoryClient: { fetch: significantEventsFetch },
        },
      },
    });
  });

  it('closes the event and updates the Nightshift cache with the new document uuid', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    });
    queryClient.setQueryData<NightshiftSignificantEventsQueryData>(
      NIGHTSHIFT_SIGNIFICANT_EVENTS_QUERY_KEY,
      {
        hits: [event],
        page: 1,
        perPage: 1,
        total: 1,
      }
    );
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useCloseSignificantEvent(), { wrapper });

    act(() => result.current.closeSignificantEvent(event.event_uuid));

    await waitFor(() => expect(addSuccess).toHaveBeenCalled());

    expect(significantEventsFetch).toHaveBeenCalledWith(
      'POST /internal/significant_events/events/{id}/update',
      {
        params: { path: { id: 'event-1-v1' }, body: { status: 'closed' } },
        signal: null,
      }
    );
    expect(
      queryClient.getQueryData<NightshiftSignificantEventsQueryData>(
        NIGHTSHIFT_SIGNIFICANT_EVENTS_QUERY_KEY
      )?.hits[0]
    ).toEqual(
      expect.objectContaining({
        event_uuid: 'event-1-v2',
        previous_event_uuid: 'event-1-v1',
        status: 'closed',
      })
    );
    expect(addError).not.toHaveBeenCalled();
  });

  it('surfaces close failures as toast errors', async () => {
    significantEventsFetch.mockRejectedValueOnce(new Error('close failed'));
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useCloseSignificantEvent(), { wrapper });

    act(() => result.current.closeSignificantEvent(event.event_uuid));

    await waitFor(() => expect(addError).toHaveBeenCalled());
    expect(addSuccess).not.toHaveBeenCalled();
    expect(addError).toHaveBeenCalledWith(expect.any(Error), {
      title: 'Failed to close significant event',
    });
  });
});
