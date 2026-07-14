/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useAppToasts } from '../../../hooks/use_app_toasts';
import { useSetAttacksStatus } from './use_set_attacks_status';
import { setAttacksStatus } from '../api';
import { useInvalidateSearchAttacks } from './use_search_attacks';
import { getUpdateByQueryResponseMock } from '../../unified_alerts/__mocks__/update_responses';

jest.mock('../../../hooks/use_app_toasts');
jest.mock('../api');
jest.mock('./use_search_attacks');

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
    },
  });
  // eslint-disable-next-line react/display-name
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useSetAttacksStatus', () => {
  const mockInvalidate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAppToasts as jest.Mock).mockReturnValue({
      addSuccess: jest.fn(),
      addError: jest.fn(),
    });
    (useInvalidateSearchAttacks as jest.Mock).mockReturnValue(mockInvalidate);
  });

  it('should call setAttacksStatus and show success toast', async () => {
    const body = {
      ids: ['attack-1', 'attack-2'],
      status: 'closed' as const,
      update_related_alerts: true,
    };
    const mockResponse = getUpdateByQueryResponseMock({ updated: 2 });
    (setAttacksStatus as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { addSuccess } = useAppToasts();
    const { result } = renderHook(() => useSetAttacksStatus(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(body);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(setAttacksStatus).toHaveBeenCalledWith({ body });
    expect(addSuccess).toHaveBeenCalledWith(expect.stringContaining('2'));
    expect(mockInvalidate).toHaveBeenCalled();
  });

  it('should handle errors', async () => {
    const body = {
      ids: ['attack-1'],
      status: 'open' as const,
    };
    const error = new Error('Test error');
    (setAttacksStatus as jest.Mock).mockRejectedValueOnce(error);

    const { addError } = useAppToasts();
    const { result } = renderHook(() => useSetAttacksStatus(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(body);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(addError).toHaveBeenCalledWith(error, {
      title: expect.any(String),
    });
    expect(mockInvalidate).toHaveBeenCalled();
  });
});
