/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { UseQueryOptions } from '@kbn/react-query';
import { useQuery, useQueryClient } from '@kbn/react-query';
import { useCallback } from 'react';
import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
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

export const useRiskEngineStatus = (
  queryOptions: Pick<
    UseQueryOptions<unknown, unknown, RiskEngineStatusResponse, string[]>,
    'refetchInterval' | 'structuralSharing'
  > = {},
  {
    executionContext,
  }: {
    /**
     * Optional Kibana execution context forwarded to the risk-engine-status fetch so slow logs
     * and APM traces can attribute the query to the calling page/panel.
     */
    executionContext?: KibanaExecutionContext;
  } = {}
) => {
  const { fetchRiskEngineStatus } = useEntityAnalyticsRoutes();
  return useQuery(
    FETCH_RISK_ENGINE_STATUS,
    async ({ signal }) => fetchRiskEngineStatus({ signal, context: executionContext }),
    queryOptions
  );
};
