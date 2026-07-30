/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useSyncInterval } from './use_sync_interval';
import type { SyntheticsMaintenanceWindow } from '../../../hooks';
import { useFetchMaintenanceWindows } from '../../../hooks';

export const useHasPendingMwChanges = (monitorMWIds: string[]) => {
  const { data } = useFetchMaintenanceWindows();

  const allMWs = useMemo(() => data?.maintenanceWindows ?? [], [data]);

  const hasMonitorMWs = monitorMWIds.length > 0;

  const activeMWs: SyntheticsMaintenanceWindow[] = hasMonitorMWs
    ? allMWs.filter((mw) => mw.status === 'running' && monitorMWIds.includes(mw.id))
    : [];

  const needsPendingCheck = hasMonitorMWs && activeMWs.length === 0;

  const syncInterval = useSyncInterval();

  const hasPendingChanges = (() => {
    // Only skip the pending check while the data has not loaded yet; an empty (but loaded)
    // list is a valid state where every referenced MW would be treated as missing/pending.
    if (!needsPendingCheck || data == null) return false;

    const allMWsById = new Map(allMWs.map((mw) => [mw.id, mw]));
    const syncWindowMs = syncInterval * 60 * 1000;
    const now = Date.now();

    return monitorMWIds.some((id) => {
      const mw = allMWsById.get(id);
      if (!mw) return true;

      if (mw.updatedAt) {
        const updatedAt = new Date(mw.updatedAt).getTime();
        return now - updatedAt < syncWindowMs;
      }

      return false;
    });
  })();

  return { activeMWs, hasPendingChanges, syncInterval };
};
