/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OverviewStatusMetaData } from '../../../../../../../../common/runtime_types';
import { MONITOR_STATUS_ENUM } from '../../../../../../../../common/constants/monitor_management';

// Pick the most recent down-since across the monitor's currently-down
// locations. Picking the *most recent* (rather than oldest) matches "since
// when did *this* check fail" and avoids surfacing very old stuck states for
// monitors that are mostly recovered.
export const getLatestDownSummary = (
  monitor: OverviewStatusMetaData
): { errorMessage?: string; errorType?: string; downSince?: string; locationLabel?: string } => {
  const downLocations = (monitor.locations ?? []).filter(
    (loc) => loc.status === MONITOR_STATUS_ENUM.DOWN
  );
  if (downLocations.length === 0) {
    return { errorMessage: undefined, downSince: undefined };
  }
  const sorted = [...downLocations].sort((a, b) => {
    const aT = a.downSince ? new Date(a.downSince).getTime() : 0;
    const bT = b.downSince ? new Date(b.downSince).getTime() : 0;
    return bT - aT;
  });
  const primary = sorted[0];
  return {
    errorMessage: primary.error?.message,
    errorType: primary.error?.type,
    downSince: primary.downSince,
    locationLabel: primary.label,
  };
};
