/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from '@tanstack/react-query';
import type { SecurityAppError } from '@kbn/securitysolution-t-grid';
import type { PrivMonHealthResponse } from '../../../../common/api/entity_analytics';
import { useEntityAnalyticsRoutes } from '../api';

export const usePrivilegedMonitoringHealth = (options?: { enabled?: boolean }) => {
  const { fetchPrivilegeMonitoringEngineStatus } = useEntityAnalyticsRoutes();

  return useQuery<PrivMonHealthResponse, SecurityAppError>({
    queryKey: ['GET', 'PRIVILEGED_MONITORING_HEALTH'],
    queryFn: fetchPrivilegeMonitoringEngineStatus,
    retry: 0,
    enabled: options?.enabled,
    refetchInterval: 30000, // Refresh every 30 seconds to keep user count current
  });
};

export const useUserLimitStatus = (options?: { enabled?: boolean }) => {
  const healthQuery = usePrivilegedMonitoringHealth(options);

  const userStats = healthQuery.data?.users;
  const isLimitExceeded = userStats ? userStats.current_count > userStats.max_allowed : false;
  const isNearLimit = userStats ? userStats.current_count >= userStats.max_allowed * 0.9 : false;

  return {
    ...healthQuery,
    userStats,
    isLimitExceeded,
    isNearLimit,
    utilizationPercentage: userStats
      ? Math.round((userStats.current_count / userStats.max_allowed) * 100)
      : 0,
  };
};
