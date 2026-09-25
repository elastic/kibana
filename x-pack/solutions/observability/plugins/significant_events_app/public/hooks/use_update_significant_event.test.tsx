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
    fetch.mockResolvedValue({ event_uuid: 'event-1', updated: 1, ignored: 0, status: 'dismissed' });
    mockUseKibana.mockReturnValue({
      core: { notifications: { toasts: { addSuccess, addError } } },
      dependencies: {
        start: {
          significantEvents: { significantEventsRepositoryClient: { fetch } },
        },
      },
    } as never);
  });

  it('omits assessment_note when the caller does not pass a note', async () => {
    const { result } = renderHook(() => useUpdateSignificantEvent(), { wrapper });

    act(() => {
      result.current.updateEventStatus({ eventUuid: 'event-1', status: 'closed' });
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('POST /internal/significant_events/events/{id}/update', {
        params: { path: { id: 'event-1' }, body: { status: 'closed' } },
        signal: null,
      });
    });
  });

  it('sends assessment_note when a note is provided', async () => {
    const { result } = renderHook(() => useUpdateSignificantEvent(), { wrapper });

    act(() => {
      result.current.updateEventStatus({
        eventUuid: 'event-1',
        status: 'dismissed',
        assessmentNote: 'known noise',
      });
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('POST /internal/significant_events/events/{id}/update', {
        params: {
          path: { id: 'event-1' },
          body: { status: 'dismissed', assessment_note: 'known noise' },
        },
        signal: null,
      });
    });
  });
});
