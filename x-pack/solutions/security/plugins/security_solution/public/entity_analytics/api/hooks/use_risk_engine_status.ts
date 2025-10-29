/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { UseQueryOptions } from '@kbn/react-query';
import { useQuery, useQueryClient } from '@kbn/react-query';
import { useCallback } from 'react';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import type { RiskEngineStatusResponse } from '../../../../common/api/entity_analytics/risk_engine/engine_status_route.gen';
import { RiskEngineStatusEnum } from '../../../../common/api/entity_analytics/risk_engine/engine_status_route.gen';
import { useEntityAnalyticsRoutes } from '../api';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
const FETCH_RISK_ENGINE_STATUS = ['GET', 'FETCH_RISK_ENGINE_STATUS'];

export const useInvalidateRiskEngineStatusQuery = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries(FETCH_RISK_ENGINE_STATUS, {
      refetchType: 'active',
    });
  }, [queryClient]);
};

interface RiskScoreModuleStatus {
  isLoading: boolean;
  installed?: boolean;
}

export const useIsNewRiskScoreModuleInstalled = (): RiskScoreModuleStatus => {
  const { data: riskEngineStatus, isLoading } = useRiskEngineStatus();

  if (isLoading) {
    return { isLoading: true };
  }

  return { isLoading: false, installed: !!riskEngineStatus?.isNewRiskScoreModuleInstalled };
};

export const useRiskEngineCountdownTime = (
  riskEngineStatus: RiskEngineStatus | undefined
): string => {
  const { status, runAt } = riskEngineStatus?.risk_engine_task_status || {};
  const isRunning = status === 'running' || (!!runAt && new Date(runAt) < new Date());

  return isRunning
    ? i18n.translate(
        'xpack.securitySolution.entityAnalytics.assetCriticalityResultStep.riskEngine.nowRunningMessage',
        {
          defaultMessage: 'Now running',
        }
      )
    : moment(runAt).fromNow(true);
};

export interface RiskEngineStatus extends RiskEngineStatusResponse {
  isUpdateAvailable: boolean;
  isNewRiskScoreModuleInstalled: boolean;
  isNewRiskScoreModuleAvailable: boolean;
}

export const useRiskEngineStatus = (
  queryOptions: Pick<
    UseQueryOptions<unknown, unknown, RiskEngineStatus, string[]>,
    'refetchInterval' | 'structuralSharing'
  > = {}
) => {
  const isNewRiskScoreModuleAvailable = useIsExperimentalFeatureEnabled('riskScoringRoutesEnabled');
  const { fetchRiskEngineStatus } = useEntityAnalyticsRoutes();
  return useQuery(
    FETCH_RISK_ENGINE_STATUS,
    async ({ signal }) => {
      if (!isNewRiskScoreModuleAvailable) {
        return {
          isUpdateAvailable: false,
          isNewRiskScoreModuleInstalled: false,
          isNewRiskScoreModuleAvailable,
          risk_engine_status: null,
          legacy_risk_engine_status: null,
          risk_engine_task_status: null,
        };
      }
      const response = await fetchRiskEngineStatus({ signal });
      const isUpdateAvailable =
        response?.legacy_risk_engine_status === RiskEngineStatusEnum.ENABLED &&
        response.risk_engine_status === RiskEngineStatusEnum.NOT_INSTALLED;
      const isNewRiskScoreModuleInstalled =
        response.risk_engine_status !== RiskEngineStatusEnum.NOT_INSTALLED;
      return {
        isUpdateAvailable,
        isNewRiskScoreModuleInstalled,
        isNewRiskScoreModuleAvailable,
        ...response,
      };
    },
    queryOptions
  );
};
