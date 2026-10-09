/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { getActiveMaintenanceWindows, useFetchMaintenanceWindows } from '../../../hooks';

// An MW write wakes the sync task right away; past this the sync is considered overdue.
const SYNC_GRACE_MS = 5 * 60 * 1000;

export const useHasPendingMwChanges = (monitorMWIds: string[]) => {
  const { data } = useFetchMaintenanceWindows();

  const allMWs = useMemo(() => data?.maintenanceWindows ?? [], [data]);

  const hasMonitorMWs = monitorMWIds.length > 0;

  const activeMWs = useMemo(
    () => getActiveMaintenanceWindows(allMWs, monitorMWIds),
    [allMWs, monitorMWIds]
  );

  const needsPendingCheck = hasMonitorMWs && activeMWs.length === 0;

  const isSyncOverdue = (() => {
    if (!data?.lastSuccessfulSyncAt || data.autoSyncDisabled) return false;

    const lastSyncedAt = Date.parse(data.lastSuccessfulSyncAt);
    const now = Date.now();
    return allMWs.some((mw) => {
      if (!monitorMWIds.includes(mw.id)) return false;
      const updatedAt = Date.parse(mw.updatedAt);
      return updatedAt > lastSyncedAt && now - updatedAt > SYNC_GRACE_MS;
    });
  })();

  const hasDeletedMWs = (() => {
    // Only skip the pending check while the data has not loaded yet; an empty (but loaded)
    // list is a valid state where every referenced MW would be treated as missing/pending.
    if (!needsPendingCheck || data == null) return false;

    const knownIds = new Set(allMWs.map((mw) => mw.id));
    // Edits runSoon the sync task; the callout is only for IDs the monitor still
    // references after the MW was deleted.
    return monitorMWIds.some((id) => !knownIds.has(id));
  })();

  return { activeMWs, hasPendingChanges: hasDeletedMWs || isSyncOverdue, isSyncOverdue };
};
