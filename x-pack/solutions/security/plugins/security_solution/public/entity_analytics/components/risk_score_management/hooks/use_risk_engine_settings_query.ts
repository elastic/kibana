/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, useQueryClient } from '@kbn/react-query';
import { useCallback } from 'react';
import { useEntityAnalyticsRoutes } from '../../../api/api';
import { getRiskScoreConfigurationWithDefaults, type RiskScoreConfiguration } from '../common';

const FETCH_RISK_ENGINE_SETTINGS = ['GET', 'FETCH_RISK_ENGINE_SETTINGS'];

export const useInvalidateRiskEngineSettingsQuery = () => {
  const queryClient = useQueryClient();

  return useCallback(async () => {
    await queryClient.invalidateQueries(FETCH_RISK_ENGINE_SETTINGS, {
      refetchType: 'active',
    });
  }, [queryClient]);
};

export const useRiskEngineSettingsQuery = () => {
  const { fetchRiskEngineSettings } = useEntityAnalyticsRoutes();

  const {
    data: savedRiskEngineSettings,
    isLoading: isLoadingRiskEngineSettings,
    isError,
  } = useQuery<RiskScoreConfiguration | undefined>(
    FETCH_RISK_ENGINE_SETTINGS,
    async () => {
      const riskEngineSettings = await fetchRiskEngineSettings();
      return getRiskScoreConfigurationWithDefaults(riskEngineSettings);
    },
    { retry: false, refetchOnWindowFocus: false }
  );

  return {
    savedRiskEngineSettings,
    isLoadingRiskEngineSettings,
    isError,
  };
};
