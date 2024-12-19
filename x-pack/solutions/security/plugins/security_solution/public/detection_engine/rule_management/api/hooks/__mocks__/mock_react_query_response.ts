/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryResult } from '@tanstack/react-query';

export const mockReactQueryResponse = <TData>(result: Partial<UseQueryResult<TData>>) => ({
  isLoading: false,
  error: null,
  isError: false,
  isLoadingError: false,
  isRefetchError: false,
  isSuccess: true,
  status: 'success',
  dataUpdatedAt: 0,
  errorUpdatedAt: 0,
  failureCount: 0,
  errorUpdateCount: 0,
  isFetched: true,
  isFetchedAfterMount: true,
  isFetching: false,
  isPaused: false,
  isPlaceholderData: false,
  isPreviousData: false,
  isRefetching: false,
  isStale: false,
  refetch: jest.fn(),
  remove: jest.fn(),
  fetchStatus: 'idle',
  data: undefined,
  ...result,
});
