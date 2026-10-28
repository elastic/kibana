/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestProviders } from '../../../common/mock';
import { EntityType } from '../../../../common/entity_analytics/types';
import { useCalculateEntityRiskScore } from './use_calculate_entity_risk_score';
import { waitFor, renderHook, act } from '@testing-library/react';
import { RiskEngineStatusEnum } from '../../../../common/api/entity_analytics/risk_engine/engine_status_route.gen';

const enabledRiskEngineStatus = {
  risk_engine_status: RiskEngineStatusEnum.ENABLED,
};
const disabledRiskEngineStatus = {
  risk_engine_status: RiskEngineStatusEnum.DISABLED,
};

const mockUseRiskEngineStatus = jest.fn();
jest.mock('./use_risk_engine_status', () => ({
  useRiskEngineStatus: () => mockUseRiskEngineStatus(),
}));

const mockCalculateEntityRiskScore = jest.fn();
const mockCalculateEntityRiskScoreV2 = jest.fn();
jest.mock('../api', () => ({
  useEntityAnalyticsRoutes: () => ({
    calculateEntityRiskScore: mockCalculateEntityRiskScore,
    calculateEntityRiskScoreV2: mockCalculateEntityRiskScoreV2,
  }),
}));

const mockUseUiSetting = jest.fn().mockReturnValue(false);
jest.mock('../../../common/lib/kibana/kibana_react', () => ({
  ...jest.requireActual('../../../common/lib/kibana/kibana_react'),
  useUiSetting: (...args: unknown[]) => mockUseUiSetting(...args),
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

describe('useRiskScoreData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRiskEngineStatus.mockReturnValue({ data: enabledRiskEngineStatus });
    mockCalculateEntityRiskScore.mockResolvedValue({});
    mockCalculateEntityRiskScoreV2.mockResolvedValue({});
    mockUseUiSetting.mockReturnValue(false);
    mockUseRiskEnginePrivileges.mockReturnValue(
      buildRiskEnginePrivileges({ read: true, write: true })
    );
    mockUseEntityEnginePrivileges.mockReturnValue(grantedEntityStore);
  });

  it('should call calculateEntityRiskScore API when the callback function is called', async () => {
    const { result } = renderHook(() => useCalculateEntityRiskScore(params), {
      wrapper: TestProviders,
    });

    await act(async () => {
      result.current.calculateEntityRiskScore();

      await waitFor(() =>
        expect(mockCalculateEntityRiskScore).toHaveBeenCalledWith(
          expect.objectContaining({
            identifier_type: identifierType,
            identifier,
          })
        )
      );
    });
  });

  it('should NOT call calculateEntityRiskScore API when risk engine is disabled', async () => {
    mockUseRiskEngineStatus.mockReturnValue({
      data: disabledRiskEngineStatus,
    });
    const { result } = renderHook(() => useCalculateEntityRiskScore(params), {
      wrapper: TestProviders,
    });

    await act(async () => {
      result.current.calculateEntityRiskScore();

      await waitFor(() => expect(mockCalculateEntityRiskScore).not.toHaveBeenCalled());
    });
  });

  it('should display a toast error when the API returns an error', async () => {
    mockCalculateEntityRiskScore.mockRejectedValue({});
    const { result } = renderHook(() => useCalculateEntityRiskScore(params), {
      wrapper: TestProviders,
    });

    await act(async () => {
      result.current.calculateEntityRiskScore();

      await waitFor(() => expect(mockAddError).toHaveBeenCalled());
    });
  });

  describe('when Entity Store V2 is enabled', () => {
    beforeEach(() => {
      mockUseUiSetting.mockReturnValue(true);
    });

    it('calls calculateEntityRiskScoreV2 instead of V1', async () => {
      const { result } = renderHook(() => useCalculateEntityRiskScore(params), {
        wrapper: TestProviders,
      });

      await act(async () => {
        result.current.calculateEntityRiskScore();

        await waitFor(() =>
          expect(mockCalculateEntityRiskScoreV2).toHaveBeenCalledWith(
            expect.objectContaining({
              identifier_type: identifierType,
              identifier,
            })
          )
        );
      });
    });

    it('does NOT call the V1 calculateEntityRiskScore', async () => {
      const { result } = renderHook(() => useCalculateEntityRiskScore(params), {
        wrapper: TestProviders,
      });

      await act(async () => {
        result.current.calculateEntityRiskScore();

        await waitFor(() => expect(mockCalculateEntityRiskScoreV2).toHaveBeenCalled());
        expect(mockCalculateEntityRiskScore).not.toHaveBeenCalled();
      });
    });

    it('displays a toast error when the V2 API returns an error', async () => {
      mockCalculateEntityRiskScoreV2.mockRejectedValue({});
      const { result } = renderHook(() => useCalculateEntityRiskScore(params), {
        wrapper: TestProviders,
      });

      await act(async () => {
        result.current.calculateEntityRiskScore();

        await waitFor(() => expect(mockAddError).toHaveBeenCalled());
      });
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
        wrapper: TestProviders,
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
        wrapper: TestProviders,
      });

      act(() => {
        result.current.calculateEntityRiskScore();
      });

      await waitFor(() => expect(mockCalculateEntityRiskScoreV2).toHaveBeenCalled());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(mockAddError).not.toHaveBeenCalled();
      expect(params.onSuccess).not.toHaveBeenCalled();
    });
  });
});
