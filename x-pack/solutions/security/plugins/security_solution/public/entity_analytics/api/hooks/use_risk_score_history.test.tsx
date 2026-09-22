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

beforeEach(() => {
  jest.clearAllMocks();
  (useEntityAnalyticsRoutes as jest.Mock).mockReturnValue({
    fetchRiskScoreHistory: mockFetchRiskScoreHistory,
  });
  mockFetchRiskScoreHistory.mockResolvedValue({ entries: [] });
});

describe('useRiskScoreHistory', () => {
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
    renderHook(
      () => useRiskScoreHistory({ entityType: 'user', entityId: 'user-1' }),
      { wrapper: TestWrapper }
    );

    await waitFor(() => expect(mockFetchRiskScoreHistory).toHaveBeenCalled());
    const [callArg] = mockFetchRiskScoreHistory.mock.calls[0];
    expect(callArg.context).toBeUndefined();
  });
});
