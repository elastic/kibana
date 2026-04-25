/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from '@reduxjs/toolkit';
import { MONITOR_STATUS_ENUM } from '../../../../../common/constants/monitor_management';
import type { OverviewStatusMetaData, OverviewStatusState } from '../../../../../common/runtime_types';
import type { SyntheticsAppState } from '../root_reducer';

export const getStatusByConfig = (
  configId: string,
  status?: OverviewStatusState | null,
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
      status.disabledConfigs[configByIdLoc];
    const config = configS?.locations.find((loc) => loc.id === locId);
    return config?.status ?? MONITOR_STATUS_ENUM.PENDING;
  }
};

export const selectOverviewStatus = createSelector(
  (state: SyntheticsAppState) => state.overviewStatus,
  (state: SyntheticsAppState) => state.overview.groupBy.field,
  (overviewStatus, groupByField) => {
    if (groupByField === 'monitor' || !overviewStatus.status) {
      return overviewStatus;
    }
    const status = formatStatus(overviewStatus.status, groupByField);
    return {
      ...overviewStatus,
      status,
    };
  }
);

const separateByLocation = (status: Record<string, OverviewStatusMetaData>, groupBy?: string) => {
  if (groupBy === 'monitor' || !status) {
    return status;
  }

  // if it has two or more locations, separate them by location and create new array entries per location
  // record key will become `${monitorId}-${locationId}`
  const newStatus: Record<string, OverviewStatusMetaData> = {};
  Object.entries(status).forEach(([key, value]) => {
    if (value.locations.length > 1) {
      value.locations.forEach((location) => {
        const newKey = `${key}-${location.id}`;
        newStatus[newKey] = {
          ...value,
          overallStatus: location.status,
          locations: [location],
        };
      });
    } else {
      newStatus[key] = value;
    }
  });
  return newStatus;
};
const formatStatus = (status: OverviewStatusState, groupBy?: string): OverviewStatusState => {
  if (groupBy === 'monitor' || !status) {
    return status;
  }
  return {
    ...status,
    upConfigs: separateByLocation(status.upConfigs, groupBy),
    downConfigs: separateByLocation(status.downConfigs, groupBy),
    pendingConfigs: separateByLocation(status.pendingConfigs, groupBy),
    disabledConfigs: separateByLocation(status.disabledConfigs, groupBy),
  };
};
