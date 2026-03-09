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
import type { SyntheticsMonitor } from '../../../../../../common/runtime_types';
import { ConfigKey } from '../../../../../../common/runtime_types';

export interface MonitorIntegrationStatus {
  configId: string;
  locationId: string;
  policyId: string;
  isMissing: boolean;
}

interface UseMonitorIntegrationStatusOptions {
  configIds?: string[];
  /**
   * When provided, the hook uses these monitors directly instead of reading
   * from the monitor-list Redux slice.  Useful on pages (e.g. monitor edit)
   * where the list state may not be populated.
   */
  providedMonitors?: SyntheticsMonitor[];
}

interface UseMonitorIntegrationStatusReturn {
  statuses: Map<string, MonitorIntegrationStatus[]>;
  loading: boolean;
  isResetting: boolean;
  resetMonitor: (configId: string) => Promise<void>;
  resetMonitors: (configIds: string[]) => Promise<void>;
  hasMissingIntegrations: (configId: string) => boolean;
  getMissingCount: () => number;
  getMissingCountForLocation: (locationId: string) => number;
  getMissingConfigIdsForLocation: (locationId: string) => string[];
}

/**
 * Hook to check whether monitors on private locations have their Fleet
 * package policies intact. Currently returns mock data — when the backend
 * detection route (#256393) and reset route (#256394) are merged, the
 * internals will swap to real HTTP calls with no consumer-side changes.
 */
export const useMonitorIntegrationStatus = (
  options?: UseMonitorIntegrationStatusOptions
): UseMonitorIntegrationStatusReturn => {
  const { configIds, providedMonitors } = options ?? {};
  const dispatch = useDispatch();
  const [isResetting, setIsResetting] = useState(false);
  const [resetIds, setResetIds] = useState<Set<string>>(new Set());

  const {
    data: { monitors: listMonitors },
    loaded: listLoaded,
    loading: listLoading,
  } = useSelector(selectMonitorListState);

  useEffect(() => {
    if (!providedMonitors && !listLoaded && !listLoading) {
      dispatch(fetchMonitorListAction.get(getMonitorListPageStateWithDefaults()));
    }
  }, [dispatch, providedMonitors, listLoaded, listLoading]);

  const monitors = providedMonitors ?? listMonitors;
  const loaded = providedMonitors ? providedMonitors.length > 0 : listLoaded;

  const statuses = useMemo(() => {
    const map = new Map<string, MonitorIntegrationStatus[]>();
    if (!loaded) return map;

    const filtered = configIds
      ? monitors.filter((m) => configIds.includes(m[ConfigKey.CONFIG_ID]))
      : monitors;

    let markedFirst = false;
    for (const monitor of filtered) {
      const monitorConfigId = monitor[ConfigKey.CONFIG_ID];
      const privateLocations = (monitor[ConfigKey.LOCATIONS] ?? []).filter(
        (loc) => !loc.isServiceManaged
      );

      if (privateLocations.length === 0) continue;

      const locationStatuses: MonitorIntegrationStatus[] = privateLocations.map((loc) => {
        const isMissing =
          !markedFirst && !resetIds.has(monitorConfigId);

        return {
          configId: monitorConfigId,
          locationId: loc.id,
          policyId: `mock-policy-${monitorConfigId}-${loc.id}`,
          isMissing,
        };
      });

      if (!markedFirst && locationStatuses.some((s) => s.isMissing)) {
        markedFirst = true;
      }

      map.set(monitorConfigId, locationStatuses);
    }

    return map;
  }, [loaded, monitors, configIds, resetIds]);

  const hasMissingIntegrations = useCallback(
    (configId: string): boolean => {
      const entries = statuses.get(configId);
      return entries?.some((s) => s.isMissing) ?? false;
    },
    [statuses]
  );

  const getMissingCount = useCallback((): number => {
    let count = 0;
    for (const entries of statuses.values()) {
      if (entries.some((s) => s.isMissing)) count++;
    }
    return count;
  }, [statuses]);

  const getMissingCountForLocation = useCallback(
    (locationId: string): number => {
      let count = 0;
      for (const entries of statuses.values()) {
        if (entries.some((s) => s.locationId === locationId && s.isMissing)) count++;
      }
      return count;
    },
    [statuses]
  );

  const getMissingConfigIdsForLocation = useCallback(
    (locationId: string): string[] => {
      const ids: string[] = [];
      for (const entries of statuses.values()) {
        if (entries.some((s) => s.locationId === locationId && s.isMissing)) {
          ids.push(entries[0].configId);
        }
      }
      return ids;
    },
    [statuses]
  );

  const resetMonitor = useCallback(async (configId: string): Promise<void> => {
    setIsResetting(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setResetIds((prev) => new Set(prev).add(configId));
    setIsResetting(false);
  }, []);

  const resetMonitors = useCallback(async (ids: string[]): Promise<void> => {
    setIsResetting(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setResetIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
    setIsResetting(false);
  }, []);

  return {
    statuses,
    loading: !loaded,
    isResetting,
    resetMonitor,
    resetMonitors,
    hasMissingIntegrations,
    getMissingCount,
    getMissingCountForLocation,
    getMissingConfigIdsForLocation,
  };
};
