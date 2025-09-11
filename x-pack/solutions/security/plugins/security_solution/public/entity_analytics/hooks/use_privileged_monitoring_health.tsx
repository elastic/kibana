/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { usePrivilegedMonitoringEngineStatus } from '../api/hooks/use_privileged_monitoring_engine_status';

export const usePrivilegedMonitoringHealth = () => {
  const { data: healthData, isLoading, isError, error } = usePrivilegedMonitoringEngineStatus();

  const userStats = useMemo(() => {
    if (!healthData?.users) {
      return null;
    }

    const { current_count: currentCount, max_allowed: maxAllowed } = healthData.users;
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
  }, [healthData?.users]);

  return {
    healthData,
    userStats,
    isLoading,
    isError,
    error,
  };
};
