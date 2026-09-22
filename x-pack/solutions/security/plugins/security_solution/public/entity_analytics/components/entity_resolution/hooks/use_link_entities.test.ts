/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React from 'react';
import { useLinkEntities } from './use_link_entities';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';

jest.mock('../../../../common/lib/kibana/kibana_react', () => ({
  useKibana: jest.fn(),
}));
jest.mock('../../../../common/hooks/use_app_toasts');

const mockFetch = jest.fn();
const mockAddSuccess = jest.fn();
const mockAddError = jest.fn();

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  Wrapper.displayName = 'Wrapper';
  return Wrapper;
};

describe('useLinkEntities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({ services: { http: { fetch: mockFetch } } });
    (useAppToasts as jest.Mock).mockReturnValue({
      addSuccess: mockAddSuccess,
      addError: mockAddError,
    });
  });

  it('calls POST link endpoint with correct params', async () => {
    const response = { linked: ['alias-1'], skipped: [], target_id: 'target-1' };
    mockFetch.mockResolvedValueOnce(response);

    const { result } = renderHook(() => useLinkEntities(), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate({ target_id: 'target-1', entity_ids: ['alias-1'] });
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/security/entity_store/resolution/link', {
        version: '2023-10-31',
        method: 'POST',
        body: JSON.stringify({ target_id: 'target-1', entity_ids: ['alias-1'] }),
      });
    });
  });

  it('shows success toast on completion', async () => {
    mockFetch.mockResolvedValueOnce({ linked: ['alias-1'], skipped: [], target_id: 'target-1' });

    const { result } = renderHook(() => useLinkEntities(), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate({ target_id: 'target-1', entity_ids: ['alias-1'] });
    });

    await waitFor(() => {
      expect(mockAddSuccess).toHaveBeenCalled();
    });
  });

  it('shows error toast on failure', async () => {
    const error = new Error('Link failed');
    mockFetch.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useLinkEntities(), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate({ target_id: 'target-1', entity_ids: ['alias-1'] });
    });

    await waitFor(() => {
      expect(mockAddError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({ title: expect.any(String) })
      );
    });
  });
});
