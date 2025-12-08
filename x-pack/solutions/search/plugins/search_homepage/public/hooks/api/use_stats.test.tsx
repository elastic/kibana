/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { useStats } from './use_stats';
import { useKibana } from '../use_kibana';

jest.mock('../use_kibana');

const mockHttpGet = jest.fn();

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const queryClient = new QueryClient();

const wrapper: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('useStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();

    mockUseKibana.mockReturnValue({
      services: {
        http: {
          get: mockHttpGet,
        } as any,
      },
    } as any);
  });

  it('should fetch and return stats successfully', async () => {
    const mockResponse = {
      sizeStats: {
        size: '10.5 GB',
        documents: 1000000,
      },
    };

    mockHttpGet.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useStats(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const cachedData = queryClient.getQueryData(['fetchSizeStats']);

    expect(mockHttpGet).toHaveBeenCalledWith('/internal/search_homepage/stats');
    expect(result.current.data).toEqual({
      size: '10.5 GB',
      documents: 1000000,
    });

    expect(cachedData).toEqual({
      size: '10.5 GB',
      documents: 1000000,
    });
  });
});
