/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { UseMutationOptions } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import type {
  RiskEngineScheduleNowResponse,
  RiskEngineScheduleNowErrorResponse,
} from '../../../../common/api/entity_analytics/risk_engine/engine_schedule_now_route.gen';
import { RISK_ENGINE_SCHEDULE_NOW_URL } from '../../../../common/constants';
import { useEntityAnalyticsRoutes } from '../api';
import { useInvalidateRiskEngineStatusQuery } from './use_risk_engine_status';

export const SCHEDULE_NOW_RISK_ENGINE_MUTATION_KEY = ['POST', RISK_ENGINE_SCHEDULE_NOW_URL];

export const useScheduleNowRiskEngineMutation = (options?: UseMutationOptions<{}>) => {
  const invalidateRiskEngineStatusQuery = useInvalidateRiskEngineStatusQuery();
  const { scheduleNowRiskEngine } = useEntityAnalyticsRoutes();

  return useMutation<RiskEngineScheduleNowResponse, { body: RiskEngineScheduleNowErrorResponse }>(
    () => scheduleNowRiskEngine(),
    {
      ...options,
      mutationKey: SCHEDULE_NOW_RISK_ENGINE_MUTATION_KEY,
      onSettled: (...args) => {
        invalidateRiskEngineStatusQuery();

        if (options?.onSettled) {
          options.onSettled(...args);
        }
      },
    }
  );
};
