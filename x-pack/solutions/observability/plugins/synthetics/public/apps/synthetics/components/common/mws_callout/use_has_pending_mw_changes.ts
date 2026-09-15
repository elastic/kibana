/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { getActiveMaintenanceWindows, useFetchMaintenanceWindows } from '../../../hooks';

/** How long after an MW write we still show the pending callout while Fleet/agents catch up. */
const MW_PENDING_SYNC_WINDOW_MS = 5 * 60 * 1000;

export const useHasPendingMwChanges = (monitorMWIds: string[]) => {
  const { data } = useFetchMaintenanceWindows();

  const allMWs = useMemo(() => data?.maintenanceWindows ?? [], [data]);

  const hasMonitorMWs = monitorMWIds.length > 0;

  const activeMWs = useMemo(
    () => getActiveMaintenanceWindows(allMWs, monitorMWIds),
    [allMWs, monitorMWIds]
  );

  const needsPendingCheck = hasMonitorMWs && activeMWs.length === 0;

  const hasPendingChanges = (() => {
    // Only skip the pending check while the data has not loaded yet; an empty (but loaded)
    // list is a valid state where every referenced MW would be treated as missing/pending.
    if (!needsPendingCheck || data == null) return false;

    const allMWsById = new Map(allMWs.map((mw) => [mw.id, mw]));
    const now = Date.now();

    return monitorMWIds.some((id) => {
      const mw = allMWsById.get(id);
      if (!mw) return true;

      if (mw.updatedAt) {
        const updatedAt = new Date(mw.updatedAt).getTime();
        return now - updatedAt < MW_PENDING_SYNC_WINDOW_MS;
      }

      return false;
    });
  })();

  return { activeMWs, hasPendingChanges };
};
