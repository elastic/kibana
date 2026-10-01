/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import {
  isRuleChangeTrackingDisabledError,
  useInfiniteChangeHistory,
} from './use_infinite_change_history';
import { fetchRuleChangeHistoryById } from '../api';

jest.mock('../api', () => ({
  fetchRuleChangeHistoryById: jest.fn(),
}));

const mockAddError = jest.fn();
jest.mock('../../../../common/hooks/use_app_toasts', () => ({
  useAppToasts: () => ({ addError: mockAddError }),
}));

const mockFetchRuleChangeHistoryById = fetchRuleChangeHistoryById as jest.Mock;

const createWrapper = () => {
  const queryClient = new QueryClient({
    // retryDelay: 0 keeps retries instant in tests; the hook's own `retry` predicate
    // still governs whether/how many retries happen.
    defaultOptions: { queries: { retry: false, retryDelay: 0 } },
    logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  Wrapper.displayName = 'TestQueryClientWrapper';
  return Wrapper;
};

describe('isRuleChangeTrackingDisabledError', () => {
  it('returns true for a 403 response error', () => {
    expect(isRuleChangeTrackingDisabledError({ response: { status: 403 } })).toBe(true);
  });

  it('returns false for other status codes', () => {
    expect(isRuleChangeTrackingDisabledError({ response: { status: 500 } })).toBe(false);
  });

  it('returns false for null/undefined/malformed errors', () => {
    expect(isRuleChangeTrackingDisabledError(null)).toBe(false);
    expect(isRuleChangeTrackingDisabledError(undefined)).toBe(false);
    expect(isRuleChangeTrackingDisabledError(new Error('boom'))).toBe(false);
  });
});

describe('useInfiniteChangeHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not show a toast when rule changes history is disabled (403)', async () => {
    mockFetchRuleChangeHistoryById.mockRejectedValue({ response: { status: 403 } });

    const { result } = renderHook(() => useInfiniteChangeHistory({ ruleId: 'rule-1' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockAddError).not.toHaveBeenCalled();
    // A single failed attempt settles the query straight into the error state: no retries.
    expect(mockFetchRuleChangeHistoryById).toHaveBeenCalledTimes(1);
  });

  it('shows a toast for other fetch failures, after retrying', async () => {
    mockFetchRuleChangeHistoryById.mockRejectedValue({ response: { status: 500 } });

    const { result } = renderHook(() => useInfiniteChangeHistory({ ruleId: 'rule-1' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(mockAddError).toHaveBeenCalledTimes(1);
    // The initial attempt plus 3 retries.
    expect(mockFetchRuleChangeHistoryById).toHaveBeenCalledTimes(4);
  });
});
