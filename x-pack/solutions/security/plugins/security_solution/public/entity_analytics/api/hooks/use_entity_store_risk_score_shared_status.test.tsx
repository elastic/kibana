/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React from 'react';
import { useEntityStoreRiskScore } from './use_entity_store_risk_score';
import { useEntityStoreRiskScoreKpi } from './use_entity_store_risk_score_kpi';
import { useEntityAnalyticsRoutes } from '../api';
import { EntityType } from '../../../../common/search_strategy';

jest.mock('../api');
jest.mock('../../../common/components/ml/hooks/use_ml_capabilities', () => ({
  useMlCapabilities: jest.fn().mockReturnValue({ isPlatinumOrTrialLicense: true }),
}));
jest.mock('../../../helper_hooks', () => ({
  useHasSecurityCapability: jest.fn().mockReturnValue(true),
}));
jest.mock('../../../common/hooks/use_error_toast', () => ({
  useErrorToast: jest.fn(),
}));
jest.mock('../../../common/hooks/use_app_toasts', () => ({
  useAppToasts: jest.fn().mockReturnValue({ addError: jest.fn() }),
}));

const mockFetchEntitiesListV2 = jest.fn();
const mockFetchRiskEngineStatus = jest.fn();

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

const listContext = {
  child: { type: 'security_solution', name: 'entity_analytics:page', id: 'risk_score' },
};
const kpiContext = {
  child: { type: 'security_solution', name: 'entity_analytics:page', id: 'risk_score_kpi' },
};
const statusContext = {
  child: { type: 'security_solution', name: 'entity_analytics:page', id: 'risk_score_status' },
};

beforeEach(() => {
  jest.clearAllMocks();
  (useEntityAnalyticsRoutes as jest.Mock).mockReturnValue({
    fetchEntitiesListV2: mockFetchEntitiesListV2,
    fetchRiskEngineStatus: mockFetchRiskEngineStatus,
  });
  mockFetchRiskEngineStatus.mockResolvedValue({
    risk_engine_status: 'ENABLED',
    risk_engine_task_status: { status: 'idle', runAt: '2026-01-01T00:00:00Z' },
  });
  mockFetchEntitiesListV2.mockResolvedValue({
    total: 0,
    records: [],
    inspect: { dsl: [], response: [] },
  });
});

describe('entity store risk score hooks sharing a status context', () => {
  it('sends one risk-engine-status request while keeping distinct list and KPI contexts', async () => {
    renderHook(
      () => ({
        score: useEntityStoreRiskScore({
          riskEntity: EntityType.host,
          pagination: { cursorStart: 0, querySize: 10 },
          executionContext: listContext,
          statusExecutionContext: statusContext,
        }),
        kpi: useEntityStoreRiskScoreKpi({
          riskEntity: EntityType.host,
          executionContext: kpiContext,
          statusExecutionContext: statusContext,
        }),
      }),
      { wrapper: TestWrapper }
    );

    await waitFor(() => expect(mockFetchEntitiesListV2).toHaveBeenCalledTimes(2));

    expect(mockFetchRiskEngineStatus).toHaveBeenCalledTimes(1);
    expect(mockFetchRiskEngineStatus).toHaveBeenCalledWith(
      expect.objectContaining({ context: statusContext })
    );
    expect(mockFetchEntitiesListV2).toHaveBeenCalledWith(
      expect.objectContaining({ context: listContext })
    );
    expect(mockFetchEntitiesListV2).toHaveBeenCalledWith(
      expect.objectContaining({ context: kpiContext })
    );
  });

  it('sends one status request per distinct context when no statusExecutionContext is given', async () => {
    renderHook(
      () => ({
        score: useEntityStoreRiskScore({
          riskEntity: EntityType.host,
          pagination: { cursorStart: 0, querySize: 10 },
          executionContext: listContext,
        }),
        kpi: useEntityStoreRiskScoreKpi({
          riskEntity: EntityType.host,
          executionContext: kpiContext,
        }),
      }),
      { wrapper: TestWrapper }
    );

    await waitFor(() => expect(mockFetchEntitiesListV2).toHaveBeenCalledTimes(2));

    expect(mockFetchRiskEngineStatus).toHaveBeenCalledTimes(2);
    expect(mockFetchRiskEngineStatus).toHaveBeenCalledWith(
      expect.objectContaining({ context: listContext })
    );
    expect(mockFetchRiskEngineStatus).toHaveBeenCalledWith(
      expect.objectContaining({ context: kpiContext })
    );
  });
});
