/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useRiskScoreStatus } from './use_risk_score_status';
import { useRiskEngineStatus } from '../../api/hooks/use_risk_engine_status';
import { RiskEngineStatusEnum } from '../../../../common/api/entity_analytics/risk_engine/engine_status_route.gen';

jest.mock('../../api/hooks/use_risk_engine_status');

const mockUseRiskEngineStatus = useRiskEngineStatus as jest.Mock;

const setEngineStatus = (status: keyof typeof RiskEngineStatusEnum | undefined, isLoading = false) =>
  mockUseRiskEngineStatus.mockReturnValue({
    data: status ? { risk_engine_status: RiskEngineStatusEnum[status] } : undefined,
    isLoading,
  });

describe('useRiskScoreStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns isLoading: true while the engine status query is loading', () => {
    setEngineStatus(undefined, true);

    const { result } = renderHook(() => useRiskScoreStatus());

    expect(result.current).toEqual({
      reason: 'unknown',
      facts: {},
      isLoading: true,
    });
  });

  it('returns isLoading: true and reason: unknown when skip is set', () => {
    setEngineStatus('ENABLED');

    const { result } = renderHook(() => useRiskScoreStatus({ skip: true }));

    expect(result.current).toEqual({
      reason: 'unknown',
      facts: {},
      isLoading: true,
    });
  });

  it('maps NOT_INSTALLED to engine_not_installed', () => {
    setEngineStatus('NOT_INSTALLED');

    const { result } = renderHook(() => useRiskScoreStatus());

    expect(result.current.reason).toBe('engine_not_installed');
    expect(result.current.isLoading).toBe(false);
  });

  it('maps DISABLED to engine_disabled', () => {
    setEngineStatus('DISABLED');

    const { result } = renderHook(() => useRiskScoreStatus());

    expect(result.current.reason).toBe('engine_disabled');
  });

  it('returns no_matching_alerts when engine is ENABLED and the caller reports an empty result', () => {
    setEngineStatus('ENABLED');

    const { result } = renderHook(() => useRiskScoreStatus({ isResultEmpty: true }));

    expect(result.current.reason).toBe('no_matching_alerts');
  });

  it('returns unknown when engine is ENABLED and the caller has data', () => {
    setEngineStatus('ENABLED');

    const { result } = renderHook(() => useRiskScoreStatus({ isResultEmpty: false }));

    expect(result.current.reason).toBe('unknown');
  });

  it('forwards caller-supplied facts into the result', () => {
    setEngineStatus('ENABLED');

    const { result } = renderHook(() =>
      useRiskScoreStatus({
        isResultEmpty: true,
        facts: { entitiesTracked: 42, scoringWindow: { start: 'now-30d', end: 'now' } },
      })
    );

    expect(result.current.facts).toEqual({
      entitiesTracked: 42,
      scoringWindow: { start: 'now-30d', end: 'now' },
    });
  });
});
