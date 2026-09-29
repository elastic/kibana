/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React from 'react';
import { useEntityStoreRiskScoreKpi } from './use_entity_store_risk_score_kpi';
import { useEntityAnalyticsRoutes } from '../api';
import { useRiskEngineStatus } from './use_risk_engine_status';
import { EntityType } from '../../../../common/search_strategy';

jest.mock('../api');
jest.mock('./use_risk_engine_status', () => ({
  useRiskEngineStatus: jest.fn(),
}));
jest.mock('../../../common/components/ml/hooks/use_ml_capabilities', () => ({
  useMlCapabilities: jest.fn().mockReturnValue({ isPlatinumOrTrialLicense: true }),
}));
jest.mock('../../../helper_hooks', () => ({
  useHasSecurityCapability: jest.fn().mockReturnValue(true),
}));
jest.mock('../../../common/hooks/use_app_toasts', () => ({
  useAppToasts: jest.fn().mockReturnValue({ addError: jest.fn() }),
}));

const mockFetchEntitiesListV2 = jest.fn();
const mockUseRiskEngineStatus = useRiskEngineStatus as jest.Mock;

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

const executionContext = {
  child: {
    type: 'security_solution',
    name: 'entity_analytics:home_page',
    id: 'host_risk_score_kpi',
  },
};

const enabledStatus = {
  data: {
    risk_engine_status: 'ENABLED',
    risk_engine_task_status: { status: 'idle', runAt: '2026-01-01T00:00:00Z' },
  },
  isFetching: false,
  refetch: jest.fn(),
};

const emptyPage = { total: 0, records: [], inspect: { dsl: [], response: [] } };

beforeEach(() => {
  jest.clearAllMocks();
  (useEntityAnalyticsRoutes as jest.Mock).mockReturnValue({
    fetchEntitiesListV2: mockFetchEntitiesListV2,
  });
  mockUseRiskEngineStatus.mockReturnValue(enabledStatus);
  mockFetchEntitiesListV2.mockResolvedValue(emptyPage);
});

describe('useEntityStoreRiskScoreKpi', () => {
  it('forwards executionContext to useRiskEngineStatus', () => {
    renderHook(
      () => useEntityStoreRiskScoreKpi({ riskEntity: EntityType.host, executionContext }),
      { wrapper: TestWrapper }
    );

    expect(mockUseRiskEngineStatus).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ executionContext })
    );
  });

  it('forwards executionContext to every paginated fetchEntitiesListV2 call', async () => {
    // Two non-empty pages (each 1 record) then an empty stop page.
    // The loop exits once fetched >= total (2 >= 2).
    const page = { total: 2, inspect: { dsl: [], response: [] } };
    const hostRecord = { host: { name: 'host-1', risk: { calculated_level: 'Low' } } };
    mockFetchEntitiesListV2
      .mockResolvedValueOnce({ ...page, records: [hostRecord] })
      .mockResolvedValueOnce({ ...page, records: [hostRecord] });

    renderHook(
      () => useEntityStoreRiskScoreKpi({ riskEntity: EntityType.host, executionContext }),
      { wrapper: TestWrapper }
    );

    await waitFor(() => expect(mockFetchEntitiesListV2).toHaveBeenCalledTimes(2));

    for (const [callArg] of mockFetchEntitiesListV2.mock.calls) {
      expect(callArg).toEqual(expect.objectContaining({ context: executionContext }));
    }
  });
});
