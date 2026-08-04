/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux-v7';
import { useSyncInterval } from './use_sync_interval';
import { useActiveMaintenanceWindows } from '../../../hooks';
import {
  getMaintenanceWindowsAction,
  selectMaintenanceWindowsState,
} from '../../../state/maintenance_windows';
import { useSyntheticsRefreshContext } from '../../../contexts';

export const useHasPendingMwChanges = (monitorMWIds: string[]) => {
  const dispatch = useDispatch();

  const activeMWs = useActiveMaintenanceWindows(monitorMWIds);

  const { data: allMWsData } = useSelector(selectMaintenanceWindowsState);
  const { lastRefresh } = useSyntheticsRefreshContext();

  const hasMonitorMWs = monitorMWIds.length > 0;

  const needsPendingCheck = hasMonitorMWs && activeMWs.length === 0;

  const activeIdsKey = useMemo(
    () =>
      activeMWs
        .map((mw) => mw.id)
        .sort()
        .join(','),
    [activeMWs]
  );

  useEffect(() => {
    if (needsPendingCheck) {
      dispatch(getMaintenanceWindowsAction.get());
    }
  }, [dispatch, lastRefresh, activeIdsKey, needsPendingCheck]);

  const syncInterval = useSyncInterval();

  const hasPendingChanges = (() => {
    if (!needsPendingCheck || allMWsData == null) return false;

    const allMWsById = new Map(allMWsData.data.map((mw) => [mw.id, mw]));
    const syncWindowMs = syncInterval * 60 * 1000;
    const now = Date.now();

    return monitorMWIds.some((id) => {
      const mw = allMWsById.get(id);
      if (!mw) return true;

      const updatedAtStr = (mw as unknown as { updated_at: string | undefined }).updated_at;
      if (updatedAtStr) {
        const updatedAt = new Date(updatedAtStr).getTime();
        return now - updatedAt < syncWindowMs;
      }

      return false;
    });
  })();

  return { activeMWs, hasPendingChanges, syncInterval };
};
