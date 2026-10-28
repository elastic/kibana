/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';
import { createReactQueryWrapper } from '../../../common/mock/create_react_query_wrapper';
import { EntityType } from '../../../../common/entity_analytics/types';
import { useCalculateEntityRiskScore } from './use_calculate_entity_risk_score';

const mockCalculateEntityRiskScoreV2 = jest.fn();
jest.mock('../api', () => ({
  useEntityAnalyticsRoutes: () => ({
    calculateEntityRiskScoreV2: mockCalculateEntityRiskScoreV2,
  }),
}));

const mockUseRiskEnginePrivileges = jest.fn();
jest.mock('./use_risk_engine_privileges', () => ({
  useRiskEnginePrivileges: () => mockUseRiskEnginePrivileges(),
}));

const mockUseEntityEnginePrivileges = jest.fn();
jest.mock('../../components/entity_store/hooks/use_entity_engine_privileges', () => ({
  useEntityEnginePrivileges: () => mockUseEntityEnginePrivileges(),
}));

const buildRiskEnginePrivileges = ({ read, write }: { read: boolean; write: boolean }) => ({
  data: {
    privileges: {
      elasticsearch: {
        index: { 'risk-score.risk-score-*': { read, write } },
      },
    },
  },
});

const grantedEntityStore = { data: { has_read_permissions: true, has_write_permissions: true } };

const mockAddError = jest.fn();
jest.mock('../../../common/hooks/use_app_toasts', () => ({
  useAppToasts: jest.fn().mockReturnValue({
    addError: () => mockAddError(),
  }),
}));

const identifierType = EntityType.user;
const identifier = 'test-user';
const params = {
  identifierType,
  identifier,
  onSuccess: jest.fn(),
};

describe('useCalculateEntityRiskScore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCalculateEntityRiskScoreV2.mockResolvedValue({});
    mockUseRiskEnginePrivileges.mockReturnValue(
      buildRiskEnginePrivileges({ read: true, write: true })
    );
    mockUseEntityEnginePrivileges.mockReturnValue(grantedEntityStore);
  });

  it.each([
    [
      'the user cannot write risk scores',
      buildRiskEnginePrivileges({ read: true, write: false }),
      grantedEntityStore,
    ],
    [
      'the user cannot write to the entity store',
      buildRiskEnginePrivileges({ read: true, write: true }),
      { data: { has_read_permissions: true, has_write_permissions: false } },
    ],
  ])('does not call the API when %s', async (_, riskEnginePrivileges, entityStorePrivileges) => {
    mockUseRiskEnginePrivileges.mockReturnValue(riskEnginePrivileges);
    mockUseEntityEnginePrivileges.mockReturnValue(entityStorePrivileges);
    const { result } = renderHook(() => useCalculateEntityRiskScore(params), {
      wrapper: createReactQueryWrapper(),
    });

    await act(async () => {
      await result.current.calculateEntityRiskScore();
    });

    expect(mockCalculateEntityRiskScoreV2).not.toHaveBeenCalled();
    expect(mockAddError).not.toHaveBeenCalled();
    expect(params.onSuccess).not.toHaveBeenCalled();
  });

  it('does not show an error toast when the route rejects the user with a 403', async () => {
    mockCalculateEntityRiskScoreV2.mockRejectedValue(
      Object.assign(new Error('Forbidden'), { request: {}, response: { status: 403 } })
    );
    const { result } = renderHook(() => useCalculateEntityRiskScore(params), {
      wrapper: createReactQueryWrapper(),
    });

    act(() => {
      result.current.calculateEntityRiskScore();
    });

    await waitFor(() => expect(mockCalculateEntityRiskScoreV2).toHaveBeenCalled());
    // wait for the mutation to settle so the error handler has run
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockAddError).not.toHaveBeenCalled();
    expect(params.onSuccess).not.toHaveBeenCalled();
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
