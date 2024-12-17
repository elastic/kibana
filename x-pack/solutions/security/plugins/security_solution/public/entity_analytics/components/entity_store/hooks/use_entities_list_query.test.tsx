/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEntitiesListQuery } from './use_entities_list_query';
import { useEntityAnalyticsRoutes } from '../../../api/api';
import React from 'react';

jest.mock('../../../api/api');

describe('useEntitiesListQuery', () => {
  const fetchEntitiesListMock = jest.fn();
  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    (useEntityAnalyticsRoutes as jest.Mock).mockReturnValue({
      fetchEntitiesList: fetchEntitiesListMock,
    });
  });

  it('should call fetchEntitiesList with correct parameters', async () => {
    const searchParams = { entitiesTypes: [], page: 7 };

    fetchEntitiesListMock.mockResolvedValueOnce({ data: 'test data' });

    const { result, waitFor } = renderHook(
      () => useEntitiesListQuery({ ...searchParams, skip: false }),
      {
        wrapper: TestWrapper,
      }
    );

    await waitFor(() => result.current.isSuccess);

    expect(fetchEntitiesListMock).toHaveBeenCalledWith({ params: searchParams });
    expect(result.current.data).toEqual({ data: 'test data' });
  });

  it('should not call fetchEntitiesList if skip is true', async () => {
    const searchParams = { entitiesTypes: [], page: 7 };

    const { result } = renderHook(() => useEntitiesListQuery({ ...searchParams, skip: true }), {
      wrapper: TestWrapper,
    });

    expect(fetchEntitiesListMock).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
  });
});
