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
import { useFetchEventInvestigation } from './use_fetch_event_investigation';

jest.mock('../../hooks/use_kibana');

const mockUseKibana = useKibana as jest.Mock;
const httpGet = jest.fn();

const investigation = (
  id: string,
  { status = 'open', inProgress = false }: { status?: string; inProgress?: boolean } = {}
) => ({ id, metadata: { status }, in_progress: inProgress });

const renderFetch = (
  episodeId: string | undefined,
  options?: Parameters<typeof useFetchEventInvestigation>[1]
) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useFetchEventInvestigation(episodeId, options), { wrapper });
};

describe('useFetchEventInvestigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({
      services: { http: { get: httpGet }, agenticInvestigations: {} },
    });
  });

  it("finds the event's investigation by its alert subject, keyed by the episode id", async () => {
    httpGet.mockResolvedValue({ results: [investigation('inv-1')] });
    const { result } = renderFetch('episode-1');

    await waitFor(() => expect(result.current.investigation?.id).toBe('inv-1'));
    expect(httpGet).toHaveBeenCalledWith(
      '/internal/investigations/investigations',
      expect.objectContaining({
        version: '1',
        query: expect.objectContaining({ subject_type: 'alert', subject_id: 'episode-1' }),
      })
    );
  });

  it('prefers the open investigation over a newer closed one', async () => {
    httpGet.mockResolvedValue({
      results: [investigation('closed-newer', { status: 'closed' }), investigation('open-older')],
    });
    const { result } = renderFetch('episode-1');

    await waitFor(() => expect(result.current.investigation?.id).toBe('open-older'));
  });

  it('falls back to the most recent investigation when none is open', async () => {
    httpGet.mockResolvedValue({
      results: [
        investigation('closed-newer', { status: 'closed' }),
        investigation('closed-older', { status: 'closed' }),
      ],
    });
    const { result } = renderFetch('episode-1');

    await waitFor(() => expect(result.current.investigation?.id).toBe('closed-newer'));
  });

  it('reads nothing without an episode id', () => {
    const { result } = renderFetch(undefined);

    expect(result.current.investigation).toBeUndefined();
    expect(httpGet).not.toHaveBeenCalled();
  });

  it('keeps asking until a just-started investigation is listed', async () => {
    jest.useFakeTimers();
    try {
      httpGet
        .mockResolvedValueOnce({ results: [] })
        .mockResolvedValue({ results: [investigation('started')] });
      const { result } = renderFetch('episode-1', {
        awaiting: { id: 'started', startedAt: Date.now() },
      });

      await waitFor(() => expect(httpGet).toHaveBeenCalledTimes(1));
      expect(result.current.investigation).toBeUndefined();

      await act(async () => {
        jest.advanceTimersByTime(5_000);
      });
      await waitFor(() => expect(result.current.investigation?.id).toBe('started'));
      expect(httpGet).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it('reads nothing when the agentic investigations plugin is unavailable', () => {
    mockUseKibana.mockReturnValue({ services: { http: { get: httpGet } } });
    const { result } = renderFetch('episode-1');

    expect(result.current.investigation).toBeUndefined();
    expect(httpGet).not.toHaveBeenCalled();
  });
});
