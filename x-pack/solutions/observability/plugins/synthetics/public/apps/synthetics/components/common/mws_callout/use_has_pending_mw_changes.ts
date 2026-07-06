/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import { useFetchActiveMaintenanceWindows } from '@kbn/alerts-ui-shared';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useDispatch, useSelector } from 'react-redux';
import type { MaintenanceWindow } from '@kbn/alerts-ui-shared/src/maintenance_window_callout/types';
import { useSyncInterval } from './use_sync_interval';
import type { ClientPluginsStart } from '../../../../../plugin';
import {
  getMaintenanceWindowsAction,
  selectMaintenanceWindowsState,
} from '../../../state/maintenance_windows';
import { useSyntheticsRefreshContext } from '../../../contexts';

export const useHasPendingMwChanges = (monitorMWIds: string[]) => {
  const dispatch = useDispatch();

  const services = useKibana<ClientPluginsStart>().services;
  const { data: activeMWsData } = useFetchActiveMaintenanceWindows(services, {
    enabled: true,
  });

  const { data: allMWsData } = useSelector(selectMaintenanceWindowsState);
  const { lastRefresh } = useSyntheticsRefreshContext();

  const hasMonitorMWs = monitorMWIds.length > 0;

  const activeMWs: MaintenanceWindow[] =
    hasMonitorMWs && activeMWsData?.length
      ? activeMWsData.filter((mw) => monitorMWIds.includes(mw.id))
      : [];

  const needsPendingCheck = hasMonitorMWs && activeMWs.length === 0;

  const activeIdsKey = useMemo(
    () =>
      activeMWsData
        ?.map((mw) => mw.id)
        .sort()
        .join(',') ?? '',
    [activeMWsData]
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
