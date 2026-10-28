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
import { bulkDeactivateEpisodeActions } from '@kbn/alerting-v2-episodes-ui/actions';
import { useKibana } from './use_kibana';
import { useUpdateSignificantEvent } from './use_update_significant_event';

jest.mock('./use_kibana', () => ({
  useKibana: jest.fn(),
}));
jest.mock('@kbn/alerting-v2-episodes-ui/actions', () => ({
  bulkDeactivateEpisodeActions: jest.fn(),
}));

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockBulkDeactivate = bulkDeactivateEpisodeActions as jest.Mock;

describe('useUpdateSignificantEvent', () => {
  const http = { post: jest.fn() };
  const addSuccess = jest.fn();
  const addError = jest.fn();
  const addInfo = jest.fn();
  const addDanger = jest.fn();

  const wrapper = ({ children }: { children: React.ReactNode }) => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockBulkDeactivate.mockResolvedValue({ affected_count: 1, errors: [] });
    mockUseKibana.mockReturnValue({
      core: { http, notifications: { toasts: { addSuccess, addError, addInfo, addDanger } } },
    } as never);
  });

  it('deactivates the episode with the reason as given and reports success', async () => {
    const onUpdateSuccess = jest.fn();
    const { result } = renderHook(() => useUpdateSignificantEvent({ onUpdateSuccess }), {
      wrapper,
    });

    act(() => {
      result.current.deactivateEvent({ episodeId: 'episode-1', reason: 'known noise' });
    });

    await waitFor(() =>
      expect(addSuccess).toHaveBeenCalledWith({
        title: 'Significant event marked inactive',
      })
    );
    expect(mockBulkDeactivate).toHaveBeenCalledWith(http, [
      { alert_id: 'episode-1', reason: 'known noise' },
    ]);
    expect(onUpdateSuccess).toHaveBeenCalledTimes(1);
    expect(addInfo).not.toHaveBeenCalled();
    expect(addError).not.toHaveBeenCalled();
  });

  it.each([[''], ['   '], [undefined]])(
    'sends the standard operator note when the reason is %p',
    async (reason) => {
      const { result } = renderHook(() => useUpdateSignificantEvent(), { wrapper });

      act(() => {
        result.current.deactivateEvent({ episodeId: 'episode-1', reason });
      });

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
    const onUpdateSuccess = jest.fn();
    const { result } = renderHook(() => useUpdateSignificantEvent({ onUpdateSuccess }), {
      wrapper,
    });

    act(() => {
      result.current.deactivateEvent({ episodeId: 'episode-1', reason: 'noise' });
    });

    await waitFor(() => expect(addInfo).toHaveBeenCalledTimes(1));
    expect(addInfo).toHaveBeenCalledWith({
      title:
        'No change made: the significant event is already inactive or was changed by another update',
    });
    expect(addSuccess).not.toHaveBeenCalled();
    expect(addError).not.toHaveBeenCalled();
    expect(onUpdateSuccess).toHaveBeenCalledTimes(1);
  });

  it('shows an error toast for any other per-item error and keeps the caller open', async () => {
    mockBulkDeactivate.mockResolvedValue({
      affected_count: 0,
      errors: [{ id: 'episode-1', error: { code: 'ALERT_NOT_FOUND', message: 'not found' } }],
    });
    const onUpdateSuccess = jest.fn();
    const { result } = renderHook(() => useUpdateSignificantEvent({ onUpdateSuccess }), {
      wrapper,
    });

    act(() => {
      result.current.deactivateEvent({ episodeId: 'episode-1', reason: 'noise' });
    });

    await waitFor(() => expect(addError).toHaveBeenCalledTimes(1));
    expect(addError).toHaveBeenCalledWith(expect.objectContaining({ message: 'not found' }), {
      title: 'Failed to mark significant event inactive',
    });
    expect(onUpdateSuccess).not.toHaveBeenCalled();
  });

  it('uses a next-step message when the per-item error has no message', async () => {
    mockBulkDeactivate.mockResolvedValue({ affected_count: 0, errors: [] });
    const { result } = renderHook(() => useUpdateSignificantEvent(), { wrapper });

    act(() => {
      result.current.deactivateEvent({ episodeId: 'episode-1', reason: 'noise' });
    });

    await waitFor(() => expect(addError).toHaveBeenCalledTimes(1));
    expect(addError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Refresh the list and try again.' }),
      { title: 'Failed to mark significant event inactive' }
    );
  });

  it('shows the generic error toast when the request throws', async () => {
    mockBulkDeactivate.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useUpdateSignificantEvent(), { wrapper });

    act(() => {
      result.current.deactivateEvent({ episodeId: 'episode-1', reason: 'noise' });
    });

    await waitFor(() => expect(addError).toHaveBeenCalledTimes(1));
    expect(addError).toHaveBeenCalledWith(expect.any(Error), {
      title: 'Failed to mark significant event inactive',
    });
  });

  it('explains the missing Alerting v2 privilege on HTTP 403', async () => {
    mockBulkDeactivate.mockRejectedValue(
      Object.assign(new Error('Forbidden'), {
        response: { status: 403 },
        body: { statusCode: 403 },
      })
    );
    const { result } = renderHook(() => useUpdateSignificantEvent(), { wrapper });

    act(() => {
      result.current.deactivateEvent({ episodeId: 'episode-1', reason: 'noise' });
    });

    await waitFor(() => expect(addError).toHaveBeenCalledTimes(1));
    expect(addError).toHaveBeenCalledWith(expect.any(Error), {
      title:
        'Marking a significant event inactive requires the Alerting v2 "alerts write" privilege',
    });
  });

  it('shows an error toast and sends no request when the event has no episode id', () => {
    const { result } = renderHook(() => useUpdateSignificantEvent(), { wrapper });

    act(() => {
      result.current.deactivateEvent({ reason: 'noise' });
    });

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
