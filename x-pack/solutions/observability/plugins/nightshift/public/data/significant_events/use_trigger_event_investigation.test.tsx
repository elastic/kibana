/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useKibana } from '../../hooks/use_kibana';
import { isRecentInvestigationStart } from './recent_investigation_start';
import { useTriggerEventInvestigation } from './use_trigger_event_investigation';

jest.mock('../../hooks/use_kibana');

const mockUseKibana = useKibana as jest.Mock;
const investigationsFetch = jest.fn();
const addSuccess = jest.fn();
const addError = jest.fn();

const renderTrigger = (onTriggered?: jest.Mock) => {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return {
    queryClient,
    ...renderHook(() => useTriggerEventInvestigation({ onTriggered }), { wrapper }),
  };
};

describe('useTriggerEventInvestigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    investigationsFetch.mockResolvedValue({ investigation_id: 'investigation-1' });
    mockUseKibana.mockReturnValue({
      services: {
        notifications: { toasts: { addError, addSuccess } },
        nightshiftInvestigations: { investigationsClient: { fetch: investigationsFetch } },
      },
    });
  });

  it("starts an investigation of the event's alert, keyed by its episode id", async () => {
    const onTriggered = jest.fn();
    const { result, queryClient } = renderTrigger(onTriggered);
    expect(isRecentInvestigationStart(queryClient)).toBe(false);

    act(() => result.current.triggerInvestigation({ event_id: 'evt-1', episode_id: 'episode-1' }));

    await waitFor(() =>
      expect(onTriggered).toHaveBeenCalledWith('investigation-1', {
        event_id: 'evt-1',
        episode_id: 'episode-1',
      })
    );
    // The events list polls from now on, so the row moves to "In progress" without a reload.
    expect(isRecentInvestigationStart(queryClient)).toBe(true);
    expect(investigationsFetch).toHaveBeenCalledTimes(1);
    expect(investigationsFetch).toHaveBeenCalledWith('POST /internal/nightshift/investigations', {
      params: { body: { subject: { type: 'alert', ids: ['episode-1'] } } },
      signal: null,
    });
    expect(addSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Investigation started' })
    );
    expect(addError).not.toHaveBeenCalled();
  });

  it('starts nothing and shows an error when the event has no episode id', async () => {
    const onTriggered = jest.fn();
    const { result } = renderTrigger(onTriggered);

    act(() => result.current.triggerInvestigation({ event_id: 'evt-1' }));

    await waitFor(() => expect(addError).toHaveBeenCalled());
    expect(addError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'This event has no alert to investigate yet.' }),
      { title: 'Failed to start investigation' }
    );
    expect(investigationsFetch).not.toHaveBeenCalled();
    expect(onTriggered).not.toHaveBeenCalled();
  });

  it('shows an error and does not report a start when the start fails', async () => {
    investigationsFetch.mockRejectedValueOnce(new Error('start failed'));
    const onTriggered = jest.fn();
    const { result } = renderTrigger(onTriggered);

    act(() => result.current.triggerInvestigation({ event_id: 'evt-1', episode_id: 'episode-1' }));

    await waitFor(() => expect(addError).toHaveBeenCalled());
    expect(addError).toHaveBeenCalledWith(expect.objectContaining({ message: 'start failed' }), {
      title: 'Failed to start investigation',
    });
    expect(addSuccess).not.toHaveBeenCalled();
    expect(onTriggered).not.toHaveBeenCalled();
  });

  it('reports the event being started until the start settles', async () => {
    let resolveStart: (value: { investigation_id: string }) => void = () => {};
    investigationsFetch.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveStart = resolve;
      })
    );
    const { result } = renderTrigger();

    act(() => result.current.triggerInvestigation({ event_id: 'evt-1', episode_id: 'episode-1' }));
    await waitFor(() => expect(result.current.triggeringEventId).toBe('evt-1'));

    await act(async () => resolveStart({ investigation_id: 'investigation-1' }));
    await waitFor(() => expect(result.current.triggeringEventId).toBeUndefined());
  });
});
