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
import { BRIEF_QUERY_KEY } from './use_brief';
import { useDeleteBrief } from './use_delete_brief';
import { useGenerateBrief } from './use_generate_brief';

const mockFetch = jest.fn();

jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: () => ({ services: { http: { fetch: mockFetch } } }),
}));

const setup = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
    logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
  });
  const wrapper = ({ children }: React.PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
};

describe('useGenerateBrief', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('POSTs the range and connector, then invalidates the brief', async () => {
    mockFetch.mockResolvedValue({ job: { id: 'job-1', status: 'pending' }, reused: false });
    const { queryClient, wrapper } = setup();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useGenerateBrief(), { wrapper });

    act(() => result.current.generate({ range: '7d', connectorId: 'connector-1' }));

    await waitFor(() => expect(invalidate).toHaveBeenCalledWith(BRIEF_QUERY_KEY));
    expect(mockFetch).toHaveBeenCalledWith(EXECUTIVE_BRIEF_API_PATH, {
      method: 'POST',
      version: EXECUTIVE_BRIEF_API_VERSION,
      body: JSON.stringify({ range: '7d', connectorId: 'connector-1' }),
    });
  });

  it('exposes the error when the request fails', async () => {
    mockFetch.mockRejectedValue(new Error('too many briefs'));
    const { wrapper } = setup();
    const { result } = renderHook(() => useGenerateBrief(), { wrapper });

    act(() => result.current.generate({ range: '24h' }));

    await waitFor(() => expect(result.current.error?.message).toBe('too many briefs'));
  });
});

describe('useDeleteBrief', () => {
  it('DELETEs the brief and clears the cached document', async () => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({});
    const { queryClient, wrapper } = setup();
    queryClient.setQueryData(BRIEF_QUERY_KEY, { job: { status: 'succeeded' } });
    const { result } = renderHook(() => useDeleteBrief(), { wrapper });

    act(() => result.current.deleteBrief());

    await waitFor(() => expect(queryClient.getQueryData(BRIEF_QUERY_KEY)).toBeNull());
    expect(mockFetch).toHaveBeenCalledWith(EXECUTIVE_BRIEF_API_PATH, {
      method: 'DELETE',
      version: EXECUTIVE_BRIEF_API_VERSION,
    });
  });
});
