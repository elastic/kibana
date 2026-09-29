/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { renderHook, act, waitFor } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';
import { EntityType } from '../../../../common/entity_analytics/types';
import { useCalculateEntityRiskScore } from './use_calculate_entity_risk_score';

const mockCalculateEntityRiskScoreV2 = vi.fn();
vi.mock('../api', () => {
      const mocked = {
      useEntityAnalyticsRoutes: () => ({
        calculateEntityRiskScoreV2: mockCalculateEntityRiskScoreV2,
      }),
    };
      return { ...mocked, default: mocked };
    });

const mockAddError = vi.fn();
vi.mock('../../../common/hooks/use_app_toasts', () => {
      const mocked = {
      useAppToasts: vi.fn().mockReturnValue({
        addError: () => mockAddError(),
      }),
    };
      return { ...mocked, default: mocked };
    });

const identifierType = EntityType.user;
const identifier = 'test-user';
const params = {
  identifierType,
  identifier,
  onSuccess: vi.fn(),
};

describe('useCalculateEntityRiskScore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCalculateEntityRiskScoreV2.mockResolvedValue({});
  });

  it('calls calculateEntityRiskScoreV2 when the callback is invoked', async () => {
    const { result } = renderHook(() => useCalculateEntityRiskScore(params), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.calculateEntityRiskScore();
    });

    await waitFor(() =>
      expect(mockCalculateEntityRiskScoreV2).toHaveBeenCalledWith(
        expect.objectContaining({
          identifier_type: identifierType,
          identifier,
        })
      )
    );
  });

  it('displays a toast error when the API returns an error', async () => {
    mockCalculateEntityRiskScoreV2.mockRejectedValue({});
    const { result } = renderHook(() => useCalculateEntityRiskScore(params), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.calculateEntityRiskScore();
    });

    await waitFor(() => expect(mockAddError).toHaveBeenCalled());
  });

  it('forwards entityId to the V2 API call', async () => {
    const entityId = 'test-euid';
    const { result } = renderHook(() => useCalculateEntityRiskScore({ ...params, entityId }), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.calculateEntityRiskScore();
    });

    await waitFor(() =>
      expect(mockCalculateEntityRiskScoreV2).toHaveBeenCalledWith(
        expect.objectContaining({
          identifier_type: identifierType,
          identifier,
          entity_id: entityId,
        })
      )
    );
  });
});
