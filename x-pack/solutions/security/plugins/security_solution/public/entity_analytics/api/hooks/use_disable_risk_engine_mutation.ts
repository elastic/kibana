/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { UseMutationOptions } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import type { TaskManagerUnavailableResponse } from '../../../../common/api/entity_analytics/common';
import type {
  RiskEngineDisableErrorResponse,
  DisableRiskEngineResponse,
} from '../../../../common/api/entity_analytics/risk_engine/engine_disable_route.gen';
import { useEntityAnalyticsRoutes } from '../api';
import { useInvalidateRiskEngineStatusQuery } from './use_risk_engine_status';

export const DISABLE_RISK_ENGINE_MUTATION_KEY = ['POST', 'DISABLE_RISK_ENGINE'];

export const useDisableRiskEngineMutation = (options?: UseMutationOptions<{}>) => {
  const invalidateRiskEngineStatusQuery = useInvalidateRiskEngineStatusQuery();
  const { disableRiskEngine } = useEntityAnalyticsRoutes();

  return useMutation<
    DisableRiskEngineResponse,
    { body: RiskEngineDisableErrorResponse | TaskManagerUnavailableResponse }
  >(() => disableRiskEngine(), {
    ...options,
    mutationKey: DISABLE_RISK_ENGINE_MUTATION_KEY,
    onSettled: (...args) => {
      invalidateRiskEngineStatusQuery();

      if (options?.onSettled) {
        options.onSettled(...args);
      }
    },
  });
};
