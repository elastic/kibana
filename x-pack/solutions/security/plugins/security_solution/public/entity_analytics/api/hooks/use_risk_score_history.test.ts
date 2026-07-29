/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';
import { EntityType } from '../../../../common/entity_analytics/types';
import { useRiskScoreHistory } from './use_risk_score_history';

const mockFetchRiskScoreHistory = jest.fn();
jest.mock('../api', () => ({
  useEntityAnalyticsRoutes: () => ({
    fetchRiskScoreHistory: mockFetchRiskScoreHistory,
  }),
}));

const mockUseIsExperimentalFeatureEnabled = jest.fn();
jest.mock('../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: () => mockUseIsExperimentalFeatureEnabled(),
}));

const mockAddError = jest.fn();
jest.mock('../../../common/hooks/use_app_toasts', () => ({
  useAppToasts: jest.fn().mockReturnValue({
    addError: (...args: unknown[]) => mockAddError(...args),
  }),
}));

const defaultParams = {
  entityType: EntityType.user,
  entityId: 'user:test-id',
  from: 'now-90d',
  to: 'now',
};

const historyResponse = {
  entity_id: 'user:test-id',
  entity_type: 'user',
  entries: [
    {
      '@timestamp': '2026-01-01T00:00:00.000Z',
      calculated_score_norm: 42,
      calculated_level: 'Low',
    },
  ],
};

describe('useRiskScoreHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(true);
    mockFetchRiskScoreHistory.mockResolvedValue(historyResponse);
  });

  it('fetches history and returns the response', async () => {
    const { result } = renderHook(() => useRiskScoreHistory(defaultParams), {
      wrapper: TestProviders,
    });

    await waitFor(() => expect(result.current.data).toEqual(historyResponse));
    expect(mockFetchRiskScoreHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          entityType: EntityType.user,
          entityId: 'user:test-id',
          from: 'now-90d',
          to: 'now',
        }),
      })
    );
  });

  it('threads scoreType and includeContributions through to the API call', async () => {
    const { result } = renderHook(
      () =>
        useRiskScoreHistory({
          ...defaultParams,
          scoreType: 'base',
          includeContributions: true,
        }),
      { wrapper: TestProviders }
    );

    await waitFor(() => expect(result.current.data).toEqual(historyResponse));
    expect(mockFetchRiskScoreHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          scoreType: 'base',
          includeContributions: true,
        }),
      })
    );
  });

  it('does not fetch when skip is true', async () => {
    const { result } = renderHook(() => useRiskScoreHistory({ ...defaultParams, skip: true }), {
      wrapper: TestProviders,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(true));
    expect(mockFetchRiskScoreHistory).not.toHaveBeenCalled();
  });

  it('does not fetch when the riskScoreHistoryEnabled feature flag is off', async () => {
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(false);

    renderHook(() => useRiskScoreHistory(defaultParams), { wrapper: TestProviders });

    await waitFor(() => expect(mockFetchRiskScoreHistory).not.toHaveBeenCalled());
  });

  it('shows an error toast when the fetch fails', async () => {
    mockFetchRiskScoreHistory.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useRiskScoreHistory(defaultParams), {
      wrapper: TestProviders,
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    await waitFor(() => expect(mockAddError).toHaveBeenCalled());
  });
});
