/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { operatorFallbackAssessmentNote } from '@kbn/significant-events-schema';
import type { SignificantEvent } from '@kbn/significant-events-schema';
import { useKibana } from './use_kibana';
import {
  NIGHTSHIFT_SIGNIFICANT_EVENTS_QUERY_KEY,
  type NightshiftSignificantEventsQueryData,
} from './use_fetch_significant_events';
import { bulkDeactivateEpisodeActions } from '@kbn/alerting-v2-episodes-ui/actions';
import { useCloseSignificantEvent } from './use_close_significant_event';

jest.mock('./use_kibana');
jest.mock('@kbn/alerting-v2-episodes-ui/actions', () => ({
  bulkDeactivateEpisodeActions: jest.fn(),
}));

const mockUseKibana = useKibana as jest.Mock;
const http = { post: jest.fn() };
const mockBulkDeactivate = bulkDeactivateEpisodeActions as jest.Mock;
const addSuccess = jest.fn();
const addError = jest.fn();
const addInfo = jest.fn();
const addDanger = jest.fn();

const event: SignificantEvent = {
  '@timestamp': '2026-07-24T09:42:00.000Z',
  event_id: 'event-1',
  status: 'active',
  source_ids: ['logs.checkout'],
  title: 'Checkout latency',
  summary: 'Checkout latency increased.',
  severity: 'critical',
  confidence: 0.94,
};

describe('useCloseSignificantEvent', () => {
  const createWrapper = (queryClient: QueryClient) => {
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return Wrapper;
  };

  const newQueryClient = () =>
    new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    });

  const close = (result: { current: ReturnType<typeof useCloseSignificantEvent> }, args = {}) =>
    act(() =>
      result.current.closeSignificantEvent({
        eventId: event.event_id,
        episodeId: 'episode-1',
        reason: 'known noise',
        ...args,
      })
    );

  beforeEach(() => {
    jest.clearAllMocks();
    mockBulkDeactivate.mockResolvedValue({ affected_count: 1, errors: [] });
    mockUseKibana.mockReturnValue({
      services: {
        http,
        notifications: {
          toasts: { addError, addSuccess, addInfo, addDanger },
        },
      },
    });
  });

  it('deactivates the episode with the reason as given and updates the Nightshift cache', async () => {
    const queryClient = newQueryClient();
    queryClient.setQueryData<NightshiftSignificantEventsQueryData>(
      NIGHTSHIFT_SIGNIFICANT_EVENTS_QUERY_KEY,
      { hits: [event], page: 1, perPage: 1, total: 1 }
    );
    const onClosed = jest.fn();
    const { result } = renderHook(() => useCloseSignificantEvent({ onClosed }), {
      wrapper: createWrapper(queryClient),
    });

    close(result);

    await waitFor(() => expect(addSuccess).toHaveBeenCalled());
    expect(mockBulkDeactivate).toHaveBeenCalledWith(http, [
      { alert_id: 'episode-1', reason: 'known noise' },
    ]);
    expect(
      queryClient.getQueryData<NightshiftSignificantEventsQueryData>(
        NIGHTSHIFT_SIGNIFICANT_EVENTS_QUERY_KEY
      )?.hits[0]
    ).toEqual(expect.objectContaining({ status: 'inactive' }));
    expect(onClosed).toHaveBeenCalledTimes(1);
    expect(addError).not.toHaveBeenCalled();
  });

  it.each([[''], ['   '], [undefined]])(
    'sends the standard operator note when the reason is %p',
    async (reason) => {
      const { result } = renderHook(() => useCloseSignificantEvent(), {
        wrapper: createWrapper(newQueryClient()),
      });

      close(result, { reason });

      await waitFor(() => expect(addSuccess).toHaveBeenCalled());
      expect(mockBulkDeactivate).toHaveBeenCalledWith(http, [
        { alert_id: 'episode-1', reason: operatorFallbackAssessmentNote('inactive') },
      ]);
    }
  );

  it('shows an info toast, not a success, when the episode is already inactive', async () => {
    mockBulkDeactivate.mockResolvedValue({
      affected_count: 0,
      errors: [
        {
          id: 'episode-1',
          error: { code: 'INVALID_ALERT_STATE_TRANSITION', message: 'already inactive' },
        },
      ],
    });
    const onClosed = jest.fn();
    const { result } = renderHook(() => useCloseSignificantEvent({ onClosed }), {
      wrapper: createWrapper(newQueryClient()),
    });

    close(result);

    await waitFor(() => expect(addInfo).toHaveBeenCalledTimes(1));
    expect(addInfo).toHaveBeenCalledWith({
      title:
        'No change made: the significant event is already inactive or was changed by another update',
    });
    expect(addSuccess).not.toHaveBeenCalled();
    expect(addError).not.toHaveBeenCalled();
    expect(onClosed).toHaveBeenCalledTimes(1);
  });

  it('shows an error toast for any other per-item error', async () => {
    mockBulkDeactivate.mockResolvedValue({
      affected_count: 0,
      errors: [{ id: 'episode-1', error: { code: 'ALERT_NOT_FOUND', message: 'not found' } }],
    });
    const { result } = renderHook(() => useCloseSignificantEvent(), {
      wrapper: createWrapper(newQueryClient()),
    });

    close(result);

    await waitFor(() => expect(addError).toHaveBeenCalled());
    expect(addError).toHaveBeenCalledWith(expect.objectContaining({ message: 'not found' }), {
      title: 'Failed to mark significant event inactive',
    });
    expect(addSuccess).not.toHaveBeenCalled();
    expect(addInfo).not.toHaveBeenCalled();
  });

  it('uses a next-step message when the per-item error has no message', async () => {
    mockBulkDeactivate.mockResolvedValue({
      affected_count: 0,
      errors: [],
    });
    const { result } = renderHook(() => useCloseSignificantEvent(), {
      wrapper: createWrapper(newQueryClient()),
    });

    close(result);

    await waitFor(() => expect(addError).toHaveBeenCalled());
    expect(addError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Refresh the list and try again.' }),
      { title: 'Failed to mark significant event inactive' }
    );
  });

  it('shows the generic error toast when the request throws', async () => {
    mockBulkDeactivate.mockRejectedValueOnce(new Error('inactive update failed'));
    const { result } = renderHook(() => useCloseSignificantEvent(), {
      wrapper: createWrapper(newQueryClient()),
    });

    close(result);

    await waitFor(() => expect(addError).toHaveBeenCalled());
    expect(addSuccess).not.toHaveBeenCalled();
    expect(addError).toHaveBeenCalledWith(expect.any(Error), {
      title: 'Failed to mark significant event inactive',
    });
  });

  it('explains the missing Alerting v2 privilege on HTTP 403', async () => {
    mockBulkDeactivate.mockRejectedValueOnce(
      Object.assign(new Error('Forbidden'), {
        response: { status: 403 },
        body: { statusCode: 403 },
      })
    );
    const { result } = renderHook(() => useCloseSignificantEvent(), {
      wrapper: createWrapper(newQueryClient()),
    });

    close(result);

    await waitFor(() => expect(addError).toHaveBeenCalled());
    expect(addError).toHaveBeenCalledWith(expect.any(Error), {
      title:
        'Marking a significant event inactive requires the Alerting v2 "alerts write" privilege',
    });
  });

  it('shows an error toast and sends no request when the event has no episode id', () => {
    const { result } = renderHook(() => useCloseSignificantEvent(), {
      wrapper: createWrapper(newQueryClient()),
    });

    close(result, { episodeId: undefined });

    expect(addError).toHaveBeenCalledWith(
      expect.objectContaining({
        message:
          'Refresh the list and try again. This event has no Alerting v2 episode to mark inactive.',
      }),
      {
        title: 'Failed to mark significant event inactive',
      }
    );
    expect(addDanger).not.toHaveBeenCalled();
    expect(mockBulkDeactivate).not.toHaveBeenCalled();
  });
});
