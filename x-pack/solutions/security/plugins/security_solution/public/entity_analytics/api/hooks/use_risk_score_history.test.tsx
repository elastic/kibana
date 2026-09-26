/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React from 'react';
import { useRiskScoreHistory } from './use_risk_score_history';
import { useEntityAnalyticsRoutes } from '../api';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { useErrorToast } from '../../../common/hooks/use_error_toast';
import { EntityType } from '../../../../common/entity_analytics/types';

jest.mock('../api');
jest.mock('../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn().mockReturnValue(true),
}));
jest.mock('../../../common/hooks/use_error_toast', () => ({
  useErrorToast: jest.fn(),
}));

const mockFetchRiskScoreHistory = jest.fn();
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

const defaultParams = {
  entityType: EntityType.user,
  entityId: 'user:test-id',
  from: 'now-90d',
  to: 'now',
};

const historyResponse = {
  entity_id: 'user:test-id',
  entity_type: 'user',
  entries: [
    {
      '@timestamp': '2026-01-01T00:00:00.000Z',
      calculated_score_norm: 42,
      calculated_level: 'Low',
    },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  (useEntityAnalyticsRoutes as jest.Mock).mockReturnValue({
    fetchRiskScoreHistory: mockFetchRiskScoreHistory,
  });
  (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
  mockFetchRiskScoreHistory.mockResolvedValue(historyResponse);
});

describe('useRiskScoreHistory', () => {
  // --- behavioral tests (restored from PR 4 initial commit) ---

  it('fetches history and returns the response', async () => {
    const { result } = renderHook(() => useRiskScoreHistory(defaultParams), {
      wrapper: TestWrapper,
    });

    await waitFor(() => expect(result.current.data).toEqual(historyResponse));
    expect(mockFetchRiskScoreHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          entityType: EntityType.user,
          entityId: 'user:test-id',
          from: 'now-90d',
          to: 'now',
        }),
      })
    );
  });

  it('threads scoreType and includeContributions through to the API call', async () => {
    const { result } = renderHook(
      () =>
        useRiskScoreHistory({
          ...defaultParams,
          scoreType: 'base',
          includeContributions: true,
        }),
      { wrapper: TestWrapper }
    );

    await waitFor(() => expect(result.current.data).toEqual(historyResponse));
    expect(mockFetchRiskScoreHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          scoreType: 'base',
          includeContributions: true,
        }),
      })
    );
  });

  it('does not fetch when skip is true', async () => {
    renderHook(() => useRiskScoreHistory({ ...defaultParams, skip: true }), {
      wrapper: TestWrapper,
    });

    // Allow one tick for any potential effect to fire
    await new Promise((r) => setTimeout(r, 50));
    expect(mockFetchRiskScoreHistory).not.toHaveBeenCalled();
  });

  it('does not fetch when the riskScoreHistoryEnabled feature flag is off', async () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(false);

    renderHook(() => useRiskScoreHistory(defaultParams), { wrapper: TestWrapper });

    await new Promise((r) => setTimeout(r, 50));
    expect(mockFetchRiskScoreHistory).not.toHaveBeenCalled();
  });

  it('passes the error to useErrorToast when the fetch fails', async () => {
    const error = new Error('boom');
    mockFetchRiskScoreHistory.mockRejectedValue(error);

    renderHook(() => useRiskScoreHistory(defaultParams), { wrapper: TestWrapper });

    await waitFor(() => {
      const calls = (useErrorToast as jest.Mock).mock.calls;
      const errorCall = calls.find(([, e]: [unknown, unknown]) => e != null);
      expect(errorCall?.[1]).toBe(error);
    });
  });

  // --- context-forwarding tests ---

  it('forwards a caller-supplied executionContext to fetchRiskScoreHistory', async () => {
    const executionContext = {
      child: {
        type: 'security_solution',
        name: 'entity_analytics:entity_details_flyout',
        id: 'risk_score_history',
      },
    };

    renderHook(
      () =>
        useRiskScoreHistory({
          entityType: 'user',
          entityId: 'user-1',
          executionContext,
        }),
      { wrapper: TestWrapper }
    );

    await waitFor(() =>
      expect(mockFetchRiskScoreHistory).toHaveBeenCalledWith(
        expect.objectContaining({ context: executionContext })
      )
    );
  });

  it('omits context when the caller does not supply executionContext', async () => {
    renderHook(() => useRiskScoreHistory({ entityType: 'user', entityId: 'user-1' }), {
      wrapper: TestWrapper,
    });

    await waitFor(() => expect(mockFetchRiskScoreHistory).toHaveBeenCalled());
    const [callArg] = mockFetchRiskScoreHistory.mock.calls[0];
    expect(callArg.context).toBeUndefined();
  });
});
