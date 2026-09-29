/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React from 'react';
import { useEntityStoreRiskScore } from './use_entity_store_risk_score';
import { useEntityAnalyticsRoutes } from '../api';
import { useRiskEngineStatus } from './use_risk_engine_status';
import { EntityType } from '../../../../common/search_strategy';

vi.mock('../api');
vi.mock('./use_risk_engine_status', () => {
      const mocked = {
      useRiskEngineStatus: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../common/components/ml/hooks/use_ml_capabilities', () => {
      const mocked = {
      useMlCapabilities: vi.fn().mockReturnValue({ isPlatinumOrTrialLicense: true }),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../helper_hooks', () => {
      const mocked = {
      useHasSecurityCapability: vi.fn().mockReturnValue(true),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../common/hooks/use_error_toast', () => {
      const mocked = {
      useErrorToast: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

const mockFetchEntitiesListV2 = vi.fn();
const mockUseRiskEngineStatus = useRiskEngineStatus as Mock;

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

const executionContext = {
  child: {
    type: 'security_solution',
    name: 'entity_analytics:entity_details_flyout',
    id: 'host_risk_score',
  },
};

const enabledStatus = {
  data: {
    risk_engine_status: 'ENABLED',
    risk_engine_task_status: { status: 'idle', runAt: '2026-01-01T00:00:00Z' },
  },
  isFetching: false,
  refetch: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  (useEntityAnalyticsRoutes as Mock).mockReturnValue({
    fetchEntitiesListV2: mockFetchEntitiesListV2,
  });
  mockUseRiskEngineStatus.mockReturnValue(enabledStatus);
  mockFetchEntitiesListV2.mockResolvedValue({
    total: 0,
    records: [],
    inspect: { dsl: [], response: [] },
  });
});

describe('useEntityStoreRiskScore', () => {
  it('forwards executionContext to useRiskEngineStatus', () => {
    renderHook(
      () =>
        useEntityStoreRiskScore({
          riskEntity: EntityType.host,
          pagination: { cursorStart: 0, querySize: 10 },
          executionContext,
        }),
      { wrapper: TestWrapper }
    );

    expect(mockUseRiskEngineStatus).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ executionContext })
    );
  });

  it('forwards executionContext to fetchEntitiesListV2', async () => {
    renderHook(
      () =>
        useEntityStoreRiskScore({
          riskEntity: EntityType.host,
          pagination: { cursorStart: 0, querySize: 10 },
          executionContext,
        }),
      { wrapper: TestWrapper }
    );

    await waitFor(() =>
      expect(mockFetchEntitiesListV2).toHaveBeenCalledWith(
        expect.objectContaining({ context: executionContext })
      )
    );
  });
});
