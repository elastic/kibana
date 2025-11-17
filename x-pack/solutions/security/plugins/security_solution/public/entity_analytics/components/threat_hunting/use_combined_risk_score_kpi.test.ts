/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useCombinedRiskScoreKpi } from './use_combined_risk_score_kpi';
import { TestProviders } from '../../../common/mock';
import { useRiskScoreKpi } from '../../api/hooks/use_risk_score_kpi';
import { EntityType } from '../../../../common/entity_analytics/types';
import { RiskSeverity, EMPTY_SEVERITY_COUNT } from '../../../../common/search_strategy';

jest.mock('../../api/hooks/use_risk_score_kpi');
jest.mock('../../../common/hooks/use_global_filter_query', () => ({
  useGlobalFilterQuery: jest.fn(() => ({ filterQuery: '' })),
}));
jest.mock('../../../common/containers/use_global_time', () => ({
  useGlobalTime: jest.fn(() => ({
    from: 'now-24h',
    to: 'now',
  })),
}));

const mockUseRiskScoreKpi = useRiskScoreKpi as jest.Mock;

describe('useCombinedRiskScoreKpi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should aggregate severity counts from all three entity types', async () => {
    const userSeverityCount = {
      [RiskSeverity.Unknown]: 5,
      [RiskSeverity.Low]: 10,
      [RiskSeverity.Moderate]: 15,
      [RiskSeverity.High]: 20,
      [RiskSeverity.Critical]: 25,
    };

    const hostSeverityCount = {
      [RiskSeverity.Unknown]: 3,
      [RiskSeverity.Low]: 7,
      [RiskSeverity.Moderate]: 12,
      [RiskSeverity.High]: 18,
      [RiskSeverity.Critical]: 22,
    };

    const serviceSeverityCount = {
      [RiskSeverity.Unknown]: 2,
      [RiskSeverity.Low]: 5,
      [RiskSeverity.Moderate]: 8,
      [RiskSeverity.High]: 15,
      [RiskSeverity.Critical]: 20,
    };

    mockUseRiskScoreKpi
      .mockReturnValueOnce({
        severityCount: userSeverityCount,
        loading: false,
        error: undefined,
        isModuleDisabled: false,
        refetch: jest.fn(),
      })
      .mockReturnValueOnce({
        severityCount: hostSeverityCount,
        loading: false,
        error: undefined,
        isModuleDisabled: false,
        refetch: jest.fn(),
      })
      .mockReturnValueOnce({
        severityCount: serviceSeverityCount,
        loading: false,
        error: undefined,
        isModuleDisabled: false,
        refetch: jest.fn(),
      });

    const { result } = renderHook(() => useCombinedRiskScoreKpi(false), {
      wrapper: TestProviders,
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.severityCount).toEqual({
      [RiskSeverity.Unknown]: 10, // 5 + 3 + 2
      [RiskSeverity.Low]: 22, // 10 + 7 + 5
      [RiskSeverity.Moderate]: 35, // 15 + 12 + 8
      [RiskSeverity.High]: 53, // 20 + 18 + 15
      [RiskSeverity.Critical]: 67, // 25 + 22 + 20
    });
  });

  it('should return empty severity count when loading', () => {
    mockUseRiskScoreKpi.mockReturnValue({
      severityCount: undefined,
      loading: true,
      error: undefined,
      isModuleDisabled: false,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useCombinedRiskScoreKpi(false), {
      wrapper: TestProviders,
    });

    expect(result.current.loading).toBe(true);
    expect(result.current.severityCount).toEqual(EMPTY_SEVERITY_COUNT);
  });

  it('should call useRiskScoreKpi for all three entity types', () => {
    mockUseRiskScoreKpi.mockReturnValue({
      severityCount: EMPTY_SEVERITY_COUNT,
      loading: false,
      error: undefined,
      isModuleDisabled: false,
      refetch: jest.fn(),
    });

    renderHook(() => useCombinedRiskScoreKpi(false), {
      wrapper: TestProviders,
    });

    expect(mockUseRiskScoreKpi).toHaveBeenCalledTimes(3);
    expect(mockUseRiskScoreKpi).toHaveBeenCalledWith(
      expect.objectContaining({
        riskEntity: EntityType.user,
      })
    );
    expect(mockUseRiskScoreKpi).toHaveBeenCalledWith(
      expect.objectContaining({
        riskEntity: EntityType.host,
      })
    );
    expect(mockUseRiskScoreKpi).toHaveBeenCalledWith(
      expect.objectContaining({
        riskEntity: EntityType.service,
      })
    );
  });

  it('should handle errors from any entity type', () => {
    const error = new Error('Test error');
    mockUseRiskScoreKpi
      .mockReturnValueOnce({
        severityCount: EMPTY_SEVERITY_COUNT,
        loading: false,
        error: undefined,
        isModuleDisabled: false,
        refetch: jest.fn(),
      })
      .mockReturnValueOnce({
        severityCount: EMPTY_SEVERITY_COUNT,
        loading: false,
        error,
        isModuleDisabled: false,
        refetch: jest.fn(),
      })
      .mockReturnValueOnce({
        severityCount: EMPTY_SEVERITY_COUNT,
        loading: false,
        error: undefined,
        isModuleDisabled: false,
        refetch: jest.fn(),
      });

    const { result } = renderHook(() => useCombinedRiskScoreKpi(false), {
      wrapper: TestProviders,
    });

    expect(result.current.error).toBe(error);
  });

  it('should skip queries when skip is true', () => {
    mockUseRiskScoreKpi.mockReturnValue({
      severityCount: EMPTY_SEVERITY_COUNT,
      loading: false,
      error: undefined,
      isModuleDisabled: false,
      refetch: jest.fn(),
    });

    renderHook(() => useCombinedRiskScoreKpi(true), {
      wrapper: TestProviders,
    });

    expect(mockUseRiskScoreKpi).toHaveBeenCalledTimes(3);
    expect(mockUseRiskScoreKpi).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: true,
      })
    );
  });
});
