/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useKibana } from './use_kibana';
import { useUpdateSignificantEvent } from './use_update_significant_event';

jest.mock('./use_kibana', () => ({
  useKibana: jest.fn(),
}));

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

describe('useUpdateSignificantEvent', () => {
  const fetch = jest.fn();
  const addSuccess = jest.fn();
  const addError = jest.fn();
  const addWarning = jest.fn();
  const addInfo = jest.fn();

  const wrapper = ({ children }: { children: React.ReactNode }) => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

  beforeEach(() => {
    fetch.mockReset();
    addSuccess.mockReset();
    addError.mockReset();
    addWarning.mockReset();
    addInfo.mockReset();
    fetch.mockResolvedValue({ updated: 1, ignored: 0, status: 'inactive' });
    mockUseKibana.mockReturnValue({
      core: { notifications: { toasts: { addSuccess, addError, addWarning, addInfo } } },
      dependencies: {
        start: {
          significantEvents: { significantEventsRepositoryClient: { fetch } },
        },
      },
    } as never);
  });

  it('omits assessment_note when an active status is requested', async () => {
    const { result } = renderHook(() => useUpdateSignificantEvent(), { wrapper });

    act(() => {
      result.current.updateEventStatus({ eventId: 'event-1', status: 'active' });
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('POST /internal/significant_events/events/{id}/update', {
        params: { path: { id: 'event-1' }, body: { status: 'active' } },
        signal: null,
      });
    });
  });

  it('sends assessment_note when a note is provided', async () => {
    const { result } = renderHook(() => useUpdateSignificantEvent(), { wrapper });

    act(() => {
      result.current.updateEventStatus({
        eventId: 'event-1',
        status: 'inactive',
        assessmentNote: 'known noise',
      });
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('POST /internal/significant_events/events/{id}/update', {
        params: {
          path: { id: 'event-1' },
          body: { status: 'inactive', assessment_note: 'known noise' },
        },
        signal: null,
      });
    });
  });

  it('keeps the caller open and warns when the update was superseded', async () => {
    fetch.mockResolvedValue({ updated: 0, ignored: 1, status: 'active', reason: 'superseded' });
    const onUpdateSuccess = jest.fn();
    const { result } = renderHook(() => useUpdateSignificantEvent({ onUpdateSuccess }), {
      wrapper,
    });

    act(() => {
      result.current.updateEventStatus({ eventId: 'event-1', status: 'inactive' });
    });

    await waitFor(() => expect(addWarning).toHaveBeenCalledTimes(1));
    expect(onUpdateSuccess).not.toHaveBeenCalled();
    expect(addInfo).not.toHaveBeenCalled();
  });

  it('closes the caller with an info toast on an ordinary no-op', async () => {
    fetch.mockResolvedValue({
      updated: 0,
      ignored: 1,
      status: 'inactive',
      reason: 'already_in_state',
    });
    const onUpdateSuccess = jest.fn();
    const { result } = renderHook(() => useUpdateSignificantEvent({ onUpdateSuccess }), {
      wrapper,
    });

    act(() => {
      result.current.updateEventStatus({ eventId: 'event-1', status: 'inactive' });
    });

    await waitFor(() => expect(onUpdateSuccess).toHaveBeenCalledTimes(1));
    expect(addInfo).toHaveBeenCalledTimes(1);
    expect(addWarning).not.toHaveBeenCalled();
  });
});
