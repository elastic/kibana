/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import {
  EXECUTIVE_BRIEF_API_PATH,
  EXECUTIVE_BRIEF_API_VERSION,
} from '../../../../../common/entity_analytics/executive_brief/constants';
import type { BriefJobStatus } from '../../../../../common/entity_analytics/executive_brief/document';
import { buildBriefResponse } from '../__fixtures__/flyout_brief_document';
import { BRIEF_POLL_BACKOFF_MS, getBriefPollInterval, useBrief } from './use_brief';

const mockFetch = jest.fn();

jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: () => ({ services: { http: { fetch: mockFetch } } }),
}));

const respondWith = (status: BriefJobStatus) =>
  buildBriefResponse({ job: { id: 'job-1', status, started_at: '2026-10-09T10:00:00.000Z' } });

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
    logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
  });
  const Wrapper = ({ children }: React.PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

describe('getBriefPollInterval', () => {
  it('backs off 1.5s, 3s, 5s and then stays at 5s while the job is active', () => {
    expect([0, 1, 2, 3, 10].map((attempt) => getBriefPollInterval('running', attempt))).toEqual([
      1500, 3000, 5000, 5000, 5000,
    ]);
    expect(getBriefPollInterval('pending', 0)).toBe(BRIEF_POLL_BACKOFF_MS[0]);
  });

  it.each<BriefJobStatus | undefined>(['succeeded', 'failed', undefined])(
    'does not poll when the status is %s',
    (status) => {
      expect(getBriefPollInterval(status, 0)).toBe(false);
    }
  );
});

describe('useBrief', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockFetch.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const advance = async (ms: number) => {
    await act(async () => {
      await jest.advanceTimersByTimeAsync(ms);
    });
  };

  it('requests the brief with the API version', async () => {
    mockFetch.mockResolvedValue(respondWith('succeeded'));
    const { result } = renderHook(() => useBrief(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.document).toBeDefined());

    expect(mockFetch).toHaveBeenCalledWith(
      EXECUTIVE_BRIEF_API_PATH,
      expect.objectContaining({ method: 'GET', version: EXECUTIVE_BRIEF_API_VERSION })
    );
  });

  it('treats a 404 as no brief', async () => {
    mockFetch.mockRejectedValue({ response: { status: 404 } });
    const { result } = renderHook(() => useBrief(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.document).toBeUndefined();
    expect(result.current.error).toBeUndefined();
    expect(result.current.isGenerating).toBe(false);
    await advance(10000);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('surfaces other errors', async () => {
    mockFetch.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useBrief(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.error?.message).toBe('boom'));
  });

  it('polls with backoff while the job is active and stops when it succeeds', async () => {
    mockFetch
      .mockResolvedValueOnce(respondWith('pending'))
      .mockResolvedValueOnce(respondWith('running'))
      .mockResolvedValueOnce(respondWith('running'))
      .mockResolvedValue(respondWith('succeeded'));
    const { result } = renderHook(() => useBrief(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isGenerating).toBe(true));
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // A little slack on each step: the next timer is only armed once the previous response renders.
    await advance(1400);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    await advance(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);

    await advance(2800);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    await advance(400);
    expect(mockFetch).toHaveBeenCalledTimes(3);

    await advance(4800);
    expect(mockFetch).toHaveBeenCalledTimes(3);
    await advance(400);
    expect(mockFetch).toHaveBeenCalledTimes(4);
    expect(result.current.document?.job.status).toBe('succeeded');
    expect(result.current.isGenerating).toBe(false);

    await advance(60000);
    expect(mockFetch).toHaveBeenCalledTimes(4);
  });

  it('stops polling when the job fails', async () => {
    mockFetch
      .mockResolvedValueOnce(respondWith('running'))
      .mockResolvedValue(respondWith('failed'));
    const { result } = renderHook(() => useBrief(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isGenerating).toBe(true));
    await advance(1500);
    expect(mockFetch).toHaveBeenCalledTimes(2);

    await advance(60000);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
