/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React from 'react';
import { useRiskEngineStatus } from './use_risk_engine_status';
import { useEntityAnalyticsRoutes } from '../api';

jest.mock('../api');

const mockFetchRiskEngineStatus = jest.fn();
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
  (useEntityAnalyticsRoutes as jest.Mock).mockReturnValue({
    fetchRiskEngineStatus: mockFetchRiskEngineStatus,
  });
  mockFetchRiskEngineStatus.mockResolvedValue({ risk_engine_status: 'ENABLED' });
});

describe('useRiskEngineStatus', () => {
  it('forwards a caller-supplied executionContext to fetchRiskEngineStatus', async () => {
    const executionContext = {
      child: {
        type: 'security_solution',
        name: 'entity_analytics:risk_score_management',
        id: 'risk_engine_status',
      },
    };

    renderHook(() => useRiskEngineStatus({}, { executionContext }), {
      wrapper: TestWrapper,
    });

    await waitFor(() =>
      expect(mockFetchRiskEngineStatus).toHaveBeenCalledWith(
        expect.objectContaining({ context: executionContext })
      )
    );
  });

  it('omits context when no executionContext option is supplied', async () => {
    renderHook(() => useRiskEngineStatus(), { wrapper: TestWrapper });

    await waitFor(() => expect(mockFetchRiskEngineStatus).toHaveBeenCalled());
    const [callArg] = mockFetchRiskEngineStatus.mock.calls[0];
    expect(callArg.context).toBeUndefined();
  });
});
