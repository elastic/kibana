/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchMonitorListAction,
  getMonitorListPageStateWithDefaults,
  selectMonitorListState,
} from '../../../state';
import { ConfigKey, LocationHealthStatusValue } from '../../../../../../common/runtime_types';
import { fetchMonitorHealthAction, selectMonitorHealth } from '../../../state/monitor_health';
import { resetMonitorAPI, resetMonitorBulkAPI } from '../../../state/monitor_management/api';
import { useSyntheticsRefreshContext } from '../../../contexts';

export interface MonitorIntegrationStatus {
  configId: string;
  locationId: string;
  locationLabel: string;
  policyId: string;
  status: LocationHealthStatusValue;
  isUnhealthy: boolean;
}

interface UseMonitorIntegrationHealthOptions {
  configIds?: string[];
}

interface UseMonitorIntegrationHealthReturn {
  statuses: Map<string, MonitorIntegrationStatus[]>;
  loading: boolean;
  isResetting: boolean;
  resetMonitor: (configId: string) => Promise<{ error?: Error }>;
  resetMonitors: (configIds: string[]) => Promise<{ error?: Error }>;
  isUnhealthy: (configId: string) => boolean;
  getUnhealthyLocationStatuses: (configId: string) => MonitorIntegrationStatus[];
  getUnhealthyLocationCount: () => number;
  getUnhealthyMonitorCountForLocation: (locationId: string) => number;
  getUnhealthyConfigIdsForLocation: (locationId: string) => string[];
}

export const useMonitorIntegrationHealth = (
  options?: UseMonitorIntegrationHealthOptions
): UseMonitorIntegrationHealthReturn => {
  const { configIds: explicitConfigIds } = options ?? {};
  const dispatch = useDispatch();
  const [isResetting, setIsResetting] = useState(false);
  const { lastRefresh } = useSyntheticsRefreshContext();

  const {
    data: { monitors: listMonitors },
    loaded: listLoaded,
    loading: listLoading,
  } = useSelector(selectMonitorListState);

  const { data: healthData, loading: healthLoading } = useSelector(selectMonitorHealth);

  useEffect(() => {
    if (!explicitConfigIds && !listLoaded && !listLoading) {
      dispatch(fetchMonitorListAction.get(getMonitorListPageStateWithDefaults()));
    }
  }, [dispatch, explicitConfigIds, listLoaded, listLoading]);

  const monitorIdsToFetch = useMemo(() => {
    if (explicitConfigIds) {
      return explicitConfigIds;
    }
    if (!listLoaded) {
      return [];
    }
    return listMonitors
      .filter((m) => (m[ConfigKey.LOCATIONS] ?? []).some((loc) => !loc.isServiceManaged))
      .map((m) => m[ConfigKey.CONFIG_ID]);
  }, [explicitConfigIds, listLoaded, listMonitors]);

  useEffect(() => {
    if (monitorIdsToFetch.length === 0) return;
    dispatch(fetchMonitorHealthAction.get(monitorIdsToFetch));
  }, [dispatch, monitorIdsToFetch, lastRefresh]);

  const statuses = useMemo(() => {
    const map = new Map<string, MonitorIntegrationStatus[]>();
    if (!healthData) return map;

    for (const monitor of healthData.monitors) {
      const locationStatuses: MonitorIntegrationStatus[] = monitor.locations.map((loc) => ({
        configId: monitor.configId,
        locationId: loc.locationId,
        locationLabel: loc.locationLabel,
        policyId: loc.policyId,
        status: loc.status,
        isUnhealthy: loc.status !== LocationHealthStatusValue.Healthy,
      }));
      map.set(monitor.configId, locationStatuses);
    }

    return map;
  }, [healthData]);

  const isUnhealthy = useCallback(
    (configId: string): boolean => {
      const locationStatuses = statuses.get(configId);
      return locationStatuses?.some((s) => s.isUnhealthy) ?? false;
    },
    [statuses]
  );

  const getUnhealthyLocationStatuses = useCallback(
    (configId: string): MonitorIntegrationStatus[] => {
      const locationStatuses = statuses.get(configId);
      return locationStatuses?.filter((s) => s.isUnhealthy) ?? [];
    },
    [statuses]
  );

  const getUnhealthyLocationCount = useCallback((): number => {
    let count = 0;
    for (const locationStatuses of statuses.values()) {
      if (locationStatuses.some((s) => s.isUnhealthy)) count++;
    }
    return count;
  }, [statuses]);

  const getUnhealthyMonitorCountForLocation = useCallback(
    (locationId: string): number => {
      let count = 0;
      for (const locationStatuses of statuses.values()) {
        if (locationStatuses.some((s) => s.locationId === locationId && s.isUnhealthy)) count++;
      }
      return count;
    },
    [statuses]
  );

  const getUnhealthyConfigIdsForLocation = useCallback(
    (locationId: string): string[] => {
      const ids: string[] = [];
      for (const entries of statuses.values()) {
        if (entries.some((s) => s.locationId === locationId && s.isUnhealthy)) {
          ids.push(entries[0].configId);
        }
      }
      return ids;
    },
    [statuses]
  );

  const refetchHealth = useCallback(() => {
    if (monitorIdsToFetch.length > 0) {
      dispatch(fetchMonitorHealthAction.get(monitorIdsToFetch));
    }
  }, [dispatch, monitorIdsToFetch]);

  const resetMonitor = useCallback(
    async (configId: string): Promise<{ error?: Error }> => {
      setIsResetting(true);
      try {
        await resetMonitorAPI({ id: configId });
        refetchHealth();
        return {};
      } catch (err) {
        return { error: err instanceof Error ? err : new Error(String(err)) };
      } finally {
        setIsResetting(false);
      }
    },
    [refetchHealth]
  );

  const resetMonitors = useCallback(
    async (ids: string[]): Promise<{ error?: Error }> => {
      setIsResetting(true);
      try {
        const response = await resetMonitorBulkAPI({ ids });
        const hasFailures =
          response.result.some((r) => !r.reset) ||
          (response.errors != null && response.errors.length > 0);
        if (hasFailures) {
          return { error: new Error('Failed to reset one or more monitors') };
        }
        refetchHealth();
        return {};
      } catch (err) {
        return { error: err instanceof Error ? err : new Error(String(err)) };
      } finally {
        setIsResetting(false);
      }
    },
    [refetchHealth]
  );

  const loading = explicitConfigIds ? healthLoading : !listLoaded || healthLoading;

  return {
    statuses,
    loading,
    isResetting,
    resetMonitor,
    resetMonitors,
    isUnhealthy,
    getUnhealthyLocationStatuses,
    getUnhealthyLocationCount,
    getUnhealthyMonitorCountForLocation,
    getUnhealthyConfigIdsForLocation,
  };
};
