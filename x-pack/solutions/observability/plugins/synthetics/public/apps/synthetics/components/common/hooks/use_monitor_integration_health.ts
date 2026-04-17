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
import {
  ConfigKey,
  PrivateLocationHealthStatusValue,
} from '../../../../../../common/runtime_types';
import { fetchMonitorHealthAction, selectMonitorHealth } from '../../../state/monitor_health';
import { resetMonitorAPI, resetMonitorBulkAPI } from '../../../state/monitor_management/api';
import { useSyntheticsRefreshContext } from '../../../contexts';
import { isFixableByResetStatus } from './status_labels';

export interface MonitorIntegrationStatus {
  configId: string;
  locationId: string;
  locationLabel: string;
  packagePolicyId: string;
  agentPolicyId?: string;
  status: PrivateLocationHealthStatusValue;
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
  isFixableByReset: (configId: string) => boolean;
  getUnhealthyLocationStatuses: (configId: string) => MonitorIntegrationStatus[];
  getUnhealthyMonitorCountForLocation: (locationId: string) => number;
  getUnhealthyConfigIdsForLocation: (locationId: string) => string[];
  getUnhealthyMonitorsForLocation: (
    locationId: string
  ) => Array<{ configId: string; name: string }>;
}

export const useMonitorIntegrationHealth = (
  options?: UseMonitorIntegrationHealthOptions
): UseMonitorIntegrationHealthReturn => {
  const { configIds } = options ?? {};
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
    if (!configIds && !listLoaded && !listLoading) {
      dispatch(fetchMonitorListAction.get(getMonitorListPageStateWithDefaults()));
    }
  }, [dispatch, configIds, listLoaded, listLoading]);

  const monitorIdsToFetch = useMemo(() => {
    if (configIds) {
      return configIds;
    }
    if (!listLoaded) {
      return [];
    }
    return listMonitors
      .filter((m) => (m[ConfigKey.LOCATIONS] ?? []).some((loc) => !loc.isServiceManaged))
      .map((m) => m[ConfigKey.CONFIG_ID]);
  }, [configIds, listLoaded, listMonitors]);

  useEffect(() => {
    if (monitorIdsToFetch.length === 0) return;
    dispatch(fetchMonitorHealthAction.get(monitorIdsToFetch));
  }, [dispatch, monitorIdsToFetch, lastRefresh]);

  const statuses = useMemo(() => {
    const map = new Map<string, MonitorIntegrationStatus[]>();
    if (!healthData) return map;

    for (const monitor of healthData.monitors) {
      const locationStatuses: MonitorIntegrationStatus[] = monitor.privateLocations.map((loc) => ({
        configId: monitor.configId,
        locationId: loc.locationId,
        locationLabel: loc.locationLabel,
        packagePolicyId: loc.packagePolicyId,
        agentPolicyId: loc.agentPolicyId,
        status: loc.status,
        isUnhealthy: loc.status !== PrivateLocationHealthStatusValue.Healthy,
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

  const isFixableByReset = useCallback(
    (configId: string): boolean => {
      const locationStatuses = statuses.get(configId);
      return locationStatuses?.some((s) => isFixableByResetStatus(s.status)) ?? false;
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

  const getUnhealthyMonitorsForLocation = useCallback(
    (locationId: string): Array<{ configId: string; name: string }> => {
      const monitorNameMap = new Map(
        listMonitors.map((m) => [m[ConfigKey.CONFIG_ID], m[ConfigKey.NAME]])
      );
      const monitors: Array<{ configId: string; name: string }> = [];

      for (const entries of statuses.values()) {
        const entry = entries.find((s) => s.locationId === locationId && s.isUnhealthy);
        if (entry) {
          monitors.push({
            configId: entry.configId,
            name: monitorNameMap.get(entry.configId) || entry.configId,
          });
        }
      }

      return monitors;
    },
    [statuses, listMonitors]
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
        const hasFailures = response.result.some((r) => !r.reset);
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

  const loading = configIds ? healthLoading : !listLoaded || healthLoading;

  return {
    statuses,
    loading,
    isResetting,
    resetMonitor,
    resetMonitors,
    isUnhealthy,
    isFixableByReset,
    getUnhealthyLocationStatuses,
    getUnhealthyMonitorCountForLocation,
    getUnhealthyConfigIdsForLocation,
    getUnhealthyMonitorsForLocation,
  };
};
