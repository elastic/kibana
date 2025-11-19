/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { SecurityAppError } from '@kbn/securitysolution-t-grid';
import type { PrivMonHealthResponse } from '../../../common/api/entity_analytics';
import { useEntityAnalyticsRoutes } from '../api/api';

/**
 * Helper function to compute user statistics from health data
 */
export const computeUserStats = (data: PrivMonHealthResponse | undefined) => {
  if (!data?.users) {
    return null;
  }

  const { current_count: currentCount, max_allowed: maxAllowed } = data.users;
  return {
    currentCount,
    maxAllowed,
    isLimitExceeded: currentCount > maxAllowed,
    isNearLimit: currentCount >= maxAllowed * 0.9, // 90% threshold
    remainingSlots: Math.max(0, maxAllowed - currentCount),
    usagePercentage: Math.round((currentCount / maxAllowed) * 100),
  };
};

interface UsePrivilegedMonitoringHealthOptions {
  enabled?: boolean;
}

export const usePrivilegedMonitoringHealth = (options?: UsePrivilegedMonitoringHealthOptions) => {
  const { fetchPrivilegeMonitoringEngineStatus } = useEntityAnalyticsRoutes();

  const { data, isLoading, isError, error } = useQuery<PrivMonHealthResponse, SecurityAppError>({
    queryKey: ['GET', 'PRIVILEGED_MONITORING_HEALTH'],
    queryFn: fetchPrivilegeMonitoringEngineStatus,
    retry: 0,
    enabled: options?.enabled,
    refetchInterval: 30000, // Refresh every 30 seconds to keep user count current
  });

  const userStats = computeUserStats(data);

  return {
    // Raw API data
    healthData: data,
    isLoading,
    isError,
    error,

    // Computed user stats
    userStats,
  };
};

export const usePrivilegedMonitoringEngineStatus = () => {
  const { healthData, isLoading, isError, error } = usePrivilegedMonitoringHealth();
  return { data: healthData, isLoading, isError, error };
};

// Hook specifically for user limit functionality
export const useUserLimitStatus = (options?: UsePrivilegedMonitoringHealthOptions) => {
  const { data, isLoading, isError, error } = useQuery<PrivMonHealthResponse, SecurityAppError>({
    queryKey: ['GET', 'PRIVILEGED_MONITORING_HEALTH'],
    queryFn: useEntityAnalyticsRoutes().fetchPrivilegeMonitoringEngineStatus,
    retry: 0,
    enabled: options?.enabled,
    refetchInterval: 30000,
  });

  const userStats = computeUserStats(data);

  return {
    userStats,
    isLoading,
    isError,
    error,
  };
};
