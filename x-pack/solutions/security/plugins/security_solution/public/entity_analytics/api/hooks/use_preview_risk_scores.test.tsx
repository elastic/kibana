/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React from 'react';
import { useRiskScorePreview } from './use_preview_risk_scores';
import { useEntityAnalyticsRoutes } from '../api';

jest.mock('../api');

const mockFetchRiskScorePreview = jest.fn();
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
  (useEntityAnalyticsRoutes as jest.Mock).mockReturnValue({
    fetchRiskScorePreview: mockFetchRiskScorePreview,
  });
  mockFetchRiskScorePreview.mockResolvedValue({ scores: { host: [], user: [] } });
});

describe('useRiskScorePreview', () => {
  it('labels the request with the risk-score-management execution context', async () => {
    renderHook(() => useRiskScorePreview({ data_view_id: 'test-data-view' }), {
      wrapper: TestWrapper,
    });

    await waitFor(() =>
      expect(mockFetchRiskScorePreview).toHaveBeenCalledWith(
        expect.objectContaining({
          context: {
            child: {
              type: 'security_solution',
              name: 'entity_analytics:risk_score_management',
              id: 'risk_score_preview',
            },
          },
        })
      )
    );
  });
});
