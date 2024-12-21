/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import type { RiskEngineStatusResponse } from '../../../../common/api/entity_analytics/risk_engine/engine_status_route.gen';
import { useEntityAnalyticsRoutes } from '../api';
const FETCH_RISK_ENGINE_STATUS = ['GET', 'FETCH_RISK_ENGINE_STATUS'];

export const useInvalidateRiskEngineStatusQuery = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries(FETCH_RISK_ENGINE_STATUS, {
      refetchType: 'active',
    });
  }, [queryClient]);
};

export const useRiskEngineCountdownTime = (riskEngineStatus?: RiskEngineStatusResponse): string => {
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

export const useRiskEngineStatus = (
  queryOptions: Pick<
    UseQueryOptions<unknown, unknown, RiskEngineStatusResponse, string[]>,
    'refetchInterval' | 'structuralSharing'
  > = {}
) => {
  const { fetchRiskEngineStatus } = useEntityAnalyticsRoutes();
  return useQuery(
    FETCH_RISK_ENGINE_STATUS,
    async ({ signal }) => fetchRiskEngineStatus({ signal }),
    queryOptions
  );
};
