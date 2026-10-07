/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useRiskScoreKpi } from './use_risk_score_kpi';
import { TestProviders } from '../../../common/mock';
import { useSearchStrategy } from '../../../common/containers/use_search_strategy';
import { useRiskEngineStatus } from './use_risk_engine_status';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { useAppToastsMock } from '../../../common/hooks/use_app_toasts.mock';
import { EntityType, EMPTY_SEVERITY_COUNT } from '../../../../common/search_strategy';

jest.mock('../../../common/containers/use_search_strategy', () => ({
  useSearchStrategy: jest.fn(),
}));
jest.mock('./use_risk_engine_status', () => ({
  useRiskEngineStatus: jest.fn(),
}));
jest.mock('../../../common/hooks/use_app_toasts');
jest.mock('../../../common/hooks/use_space_id', () => ({
  useSpaceId: jest.fn().mockReturnValue('default'),
}));

const mockUseSearchStrategy = useSearchStrategy as jest.Mock;
const mockUseRiskEngineStatus = useRiskEngineStatus as jest.Mock;

let appToastsMock: jest.Mocked<ReturnType<typeof useAppToastsMock.create>>;

const defaultSearchResponse = {
  loading: false,
  result: { kpiRiskScore: EMPTY_SEVERITY_COUNT },
  search: jest.fn(),
  refetch: jest.fn(),
  inspect: { dsl: [], response: [] },
  error: undefined,
};

const enabledStatus = {
  data: {
    risk_engine_status: 'ENABLED',
    risk_engine_task_status: { status: 'idle', runAt: '2026-01-01T00:00:00Z' },
  },
  isFetching: false,
  refetch: jest.fn(),
};

const executionContext = {
  child: {
    type: 'security_solution',
    name: 'entity_analytics:home_page',
    id: 'host_kpi',
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  appToastsMock = useAppToastsMock.create();
  (useAppToasts as jest.Mock).mockReturnValue(appToastsMock);
  mockUseSearchStrategy.mockReturnValue(defaultSearchResponse);
  mockUseRiskEngineStatus.mockReturnValue(enabledStatus);
});

describe('useRiskScoreKpi', () => {
  it('forwards executionContext to useSearchStrategy', () => {
    renderHook(() => useRiskScoreKpi({ riskEntity: EntityType.host, executionContext }), {
      wrapper: TestProviders,
    });

    expect(mockUseSearchStrategy).toHaveBeenCalledWith(
      expect.objectContaining({ executionContext })
    );
  });

  it('forwards executionContext to useRiskEngineStatus', () => {
    renderHook(() => useRiskScoreKpi({ riskEntity: EntityType.host, executionContext }), {
      wrapper: TestProviders,
    });

    expect(mockUseRiskEngineStatus).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ executionContext })
    );
  });
});
