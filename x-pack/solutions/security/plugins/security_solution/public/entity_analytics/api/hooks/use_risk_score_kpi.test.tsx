/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, Mocked } from 'vitest';

import { renderHook } from '@testing-library/react';
import { useRiskScoreKpi } from './use_risk_score_kpi';
import { TestProviders } from '../../../common/mock';
import { useSearchStrategy } from '../../../common/containers/use_search_strategy';
import { useRiskEngineStatus } from './use_risk_engine_status';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { useAppToastsMock } from '../../../common/hooks/use_app_toasts.mock';
import { EntityType, EMPTY_SEVERITY_COUNT } from '../../../../common/search_strategy';

vi.mock('../../../common/containers/use_search_strategy', () => {
      const mocked = {
      useSearchStrategy: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./use_risk_engine_status', () => {
      const mocked = {
      useRiskEngineStatus: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../common/hooks/use_app_toasts');
vi.mock('../../../common/hooks/use_space_id', () => {
      const mocked = {
      useSpaceId: vi.fn().mockReturnValue('default'),
    };
      return { ...mocked, default: mocked };
    });

const mockUseSearchStrategy = useSearchStrategy as Mock;
const mockUseRiskEngineStatus = useRiskEngineStatus as Mock;

let appToastsMock: Mocked<ReturnType<typeof useAppToastsMock.create>>;

const defaultSearchResponse = {
  loading: false,
  result: { kpiRiskScore: EMPTY_SEVERITY_COUNT },
  search: vi.fn(),
  refetch: vi.fn(),
  inspect: { dsl: [], response: [] },
  error: undefined,
};

const enabledStatus = {
  data: {
    risk_engine_status: 'ENABLED',
    risk_engine_task_status: { status: 'idle', runAt: '2026-01-01T00:00:00Z' },
  },
  isFetching: false,
  refetch: vi.fn(),
};

const executionContext = {
  child: {
    type: 'security_solution',
    name: 'entity_analytics:home_page',
    id: 'host_kpi',
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  appToastsMock = useAppToastsMock.create();
  (useAppToasts as Mock).mockReturnValue(appToastsMock);
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
