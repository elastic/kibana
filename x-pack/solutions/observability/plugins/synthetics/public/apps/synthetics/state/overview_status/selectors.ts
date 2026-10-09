/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'redux-toolkit-v1';
import { MONITOR_STATUS_ENUM } from '../../../../../common/constants/monitor_management';
import type {
  OverviewStatusMetaData,
  OverviewStatusState,
  PaginatedOverviewStatus,
} from '../../../../../common/runtime_types';
import type { SyntheticsAppState } from '../root_reducer';

export const selectOverviewStatusReducer = (state: SyntheticsAppState) => state.overviewStatus;

export const getStatusByConfig = (
  configId: string,
  status?: PaginatedOverviewStatus | null,
  locId?: string
) => {
  if (!status) {
    return MONITOR_STATUS_ENUM.PENDING;
  }
  // Look up the config across all status buckets so disabled and pending
  // monitors are not misreported as PENDING / UP / DOWN by accident.
  const configStatus =
    status.downConfigs[configId] ||
    status.upConfigs[configId] ||
    status.pendingConfigs[configId] ||
    status.staleConfigs?.[configId] ||
    status.disabledConfigs[configId];
  if (configStatus) {
    const config = configStatus?.locations.find((loc) => loc.id === locId);
    return config?.status ?? MONITOR_STATUS_ENUM.PENDING;
  } else {
    const configByIdLoc = configId + '-' + locId;
    const configS =
      status.downConfigs[configByIdLoc] ||
      status.upConfigs[configByIdLoc] ||
      status.pendingConfigs[configByIdLoc] ||
      status.staleConfigs?.[configByIdLoc] ||
      status.disabledConfigs[configByIdLoc];
    const config = configS?.locations.find((loc) => loc.id === locId);
    return config?.status ?? MONITOR_STATUS_ENUM.PENDING;
  }
};

/**
 * A read-only overview monitor that has no Synthetics saved object: a local
 * Heartbeat / Elastic Agent autodiscover monitor (`origin: 'heartbeat'`) or a
 * CCS remote monitor (`remote` set). These are absent from the monitor-list
 * `absoluteTotal` (which counts saved objects only), so they must be checked
 * separately when deciding whether the app has any monitors to show.
 *
 * Intentionally excludes stale saved-object entries (e.g. a just-deleted
 * monitor still lingering in the overview status until the next refetch), so
 * deleting the last saved-object monitor still lands on Getting Started.
 */
export const isExternalOverviewMonitor = (monitor: OverviewStatusMetaData): boolean =>
  monitor.origin === 'heartbeat' || Boolean(monitor.remote);

/**
 * Whether the overview status request has completed at least once (success or
 * failure). Persists across refreshes, unlike `loaded` (success-only) and the
 * transient `error`, so consumers can distinguish "settled" from "still pending".
 */
export const selectOverviewStatusSettled = (state: SyntheticsAppState): boolean =>
  state.overviewStatus.settled;

export const selectOverviewStatus = createSelector(
  (state: SyntheticsAppState) => state.overviewStatus,
  (state: SyntheticsAppState) => state.overview.groupBy.field,
  (overviewStatus, groupByField) => {
    if (!overviewStatus.status) {
      return overviewStatus;
    }

    const isPaginated = overviewStatus.status.configs != null;

    // When paginated, the server already sorted and sliced the data. The
    // config maps contain only the current page's items so counts are global
    // (from the server) rather than derived from the maps.
    if (isPaginated) {
      const status =
        groupByField === 'monitor'
          ? overviewStatus.status
          : formatStatus(overviewStatus.status, groupByField);
      return {
        ...overviewStatus,
        status: {
          ...status,
          up: overviewStatus.status.up,
          down: overviewStatus.status.down,
          pending: overviewStatus.status.pending,
          stale: overviewStatus.status.stale,
          disabledCount: overviewStatus.status.disabledCount,
        },
      };
    }

    const status =
      groupByField === 'monitor'
        ? overviewStatus.status
        : formatStatus(overviewStatus.status, groupByField);

    return {
      ...overviewStatus,
      status: {
        ...status,
        up: Object.keys(status.upConfigs).length,
        down: Object.keys(status.downConfigs).length,
        pending: Object.keys(status.pendingConfigs).length,
        stale: Object.keys(status.staleConfigs ?? {}).length,
        disabledCount: Object.keys(status.disabledConfigs).length,
      },
    };
  }
);

/**
 * Resolve the status a monitor card/row should *render* with.
 *
 * `stale` monitors stay in their `stale` bucket (so the count and the
 * "Stale" filter keep working), but when the user enables "Show last run" we
 * want the card/row to surface the last-known up/down the server carried on the
 * location (`lastStatus`) instead of the neutral "Stale" treatment. This is a
 * presentation-only resolution — it never moves a monitor between buckets.
 *
 * Returns the unchanged `overallStatus` for every other case (including when
 * the toggle is off, or when no last-known status was carried).
 */
export const resolveDisplayStatus = (
  monitor: Pick<OverviewStatusMetaData, 'overallStatus' | 'locations'>,
  showLastRun: boolean
): string => {
  const status = monitor.overallStatus;
  if (!showLastRun || status !== MONITOR_STATUS_ENUM.STALE) {
    return status;
  }
  const locations = monitor.locations ?? [];
  if (!locations.some((loc) => loc.lastStatus)) {
    return status;
  }
  return locations.some((loc) => loc.lastStatus === MONITOR_STATUS_ENUM.DOWN)
    ? MONITOR_STATUS_ENUM.DOWN
    : MONITOR_STATUS_ENUM.UP;
};

type ConfigBuckets = Pick<
  OverviewStatusState,
  'upConfigs' | 'downConfigs' | 'pendingConfigs' | 'staleConfigs' | 'disabledConfigs'
>;

const bucketForStatus = (
  buckets: ConfigBuckets,
  status: string | undefined
): Record<string, OverviewStatusMetaData> | undefined => {
  switch (status) {
    case 'up':
      return buckets.upConfigs;
    case 'down':
      return buckets.downConfigs;
    case 'disabled':
      return buckets.disabledConfigs;
    case 'pending':
      return buckets.pendingConfigs;
    case 'stale':
      return buckets.staleConfigs;
    default:
      return undefined;
  }
};

const formatStatus = (status: OverviewStatusState, groupBy?: string): OverviewStatusState => {
  if (groupBy === 'monitor' || !status) {
    return status;
  }

  // Single-location monitors stay in their server-assigned bucket. For
  // multi-location monitors we split into one entry per location keyed
  // `${configId}-${locationId}`, and route each split entry to the bucket
  // matching the *per-location* status — otherwise e.g. a monitor with a
  // down + several pending locations leaves the pending splits inside
  // `downConfigs`, breaking sort-by-status and per-bucket consumers.
  const newBuckets: ConfigBuckets = {
    upConfigs: { ...(status.upConfigs ?? {}) },
    downConfigs: { ...(status.downConfigs ?? {}) },
    pendingConfigs: { ...(status.pendingConfigs ?? {}) },
    staleConfigs: { ...(status.staleConfigs ?? {}) },
    disabledConfigs: { ...(status.disabledConfigs ?? {}) },
  };

  const sourceBuckets: Array<
    [Record<string, OverviewStatusMetaData> | undefined, Record<string, OverviewStatusMetaData>]
  > = [
    [status.upConfigs, newBuckets.upConfigs],
    [status.downConfigs, newBuckets.downConfigs],
    [status.pendingConfigs, newBuckets.pendingConfigs],
    [status.staleConfigs, newBuckets.staleConfigs],
    [status.disabledConfigs, newBuckets.disabledConfigs],
  ];

  sourceBuckets.forEach(([source, target]) => {
    Object.entries(source ?? {}).forEach(([key, value]) => {
      if (value.locations.length <= 1) return;

      delete target[key];
      value.locations.forEach((location) => {
        const newKey = `${key}-${location.id}`;
        const entry: OverviewStatusMetaData = {
          ...value,
          overallStatus: location.status,
          locations: [location],
        };
        const destination = bucketForStatus(newBuckets, location.status) ?? target;
        destination[newKey] = entry;
      });
    });
  });

  return {
    ...status,
    ...newBuckets,
  };
};
