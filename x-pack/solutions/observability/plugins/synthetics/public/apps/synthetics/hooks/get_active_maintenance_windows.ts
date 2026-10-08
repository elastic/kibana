/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SyntheticsMaintenanceWindow } from './use_fetch_maintenance_windows';

/**
 * Returns the currently-running maintenance windows that are referenced by the monitor
 * (`monitorMWIds`). Shared by the overview per-monitor icon (`useMonitorMWs`) and the
 * pending-changes callout (`useHasPendingMwChanges`) so the active-window filter lives in a
 * single place.
 */
export const getActiveMaintenanceWindows = (
  maintenanceWindows: SyntheticsMaintenanceWindow[] | undefined,
  monitorMWIds: string[] | undefined
): SyntheticsMaintenanceWindow[] => {
  if (!monitorMWIds?.length) {
    return [];
  }
  return (maintenanceWindows ?? []).filter(
    (mw) => mw.status === 'running' && monitorMWIds.includes(mw.id)
  );
};
