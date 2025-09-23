/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { SecurityAppError } from '@kbn/securitysolution-t-grid';
import type { PrivMonHealthResponse } from '../../../common/api/entity_analytics';
import { useEntityAnalyticsRoutes } from '../api/api';

interface UsePrivilegedMonitoringHealthOptions {
  enabled?: boolean;
}

export const usePrivilegedMonitoringHealth = (options?: UsePrivilegedMonitoringHealthOptions) => {
  const { fetchPrivilegeMonitoringEngineStatus } = useEntityAnalyticsRoutes();

  const healthQuery = useQuery<PrivMonHealthResponse, SecurityAppError>({
    queryKey: ['GET', 'PRIVILEGED_MONITORING_HEALTH'],
    queryFn: fetchPrivilegeMonitoringEngineStatus,
    retry: 0,
    enabled: options?.enabled,
    refetchInterval: 30000, // Refresh every 30 seconds to keep user count current
  });

  const userStats = useMemo(() => {
    if (!healthQuery.data?.users) {
      return null;
    }

    const { current_count: currentCount, max_allowed: maxAllowed } = healthQuery.data.users;
    const isLimitExceeded = currentCount > maxAllowed;
    const isNearLimit = currentCount >= maxAllowed * 0.9; // 90% threshold
    const remainingSlots = Math.max(0, maxAllowed - currentCount);
    const usagePercentage = Math.round((currentCount / maxAllowed) * 100);

    return {
      currentCount,
      maxAllowed,
      isLimitExceeded,
      isNearLimit,
      remainingSlots,
      usagePercentage,
    };
  }, [healthQuery.data?.users]);

  return {
    // Raw API data
    healthData: healthQuery.data,
    isLoading: healthQuery.isLoading,
    isError: healthQuery.isError,
    error: healthQuery.error,

    // Computed user stats
    userStats,

    // Convenience flags (for backward compatibility)
    isLimitExceeded: userStats?.isLimitExceeded ?? false,
    isNearLimit: userStats?.isNearLimit ?? false,
    utilizationPercentage: userStats?.usagePercentage ?? 0,
  };
};

// Legacy hook for backward compatibility
export const usePrivilegedMonitoringEngineStatus = () => {
  const { healthData, isLoading, isError, error } = usePrivilegedMonitoringHealth();
  return { data: healthData, isLoading, isError, error };
};

// Legacy hook for backward compatibility
export const useUserLimitStatus = (options?: UsePrivilegedMonitoringHealthOptions) => {
  const result = usePrivilegedMonitoringHealth(options);
  return {
    ...result,
    userStats: result.userStats,
    isLimitExceeded: result.isLimitExceeded,
    isNearLimit: result.isNearLimit,
    utilizationPercentage: result.utilizationPercentage,
  };
};
