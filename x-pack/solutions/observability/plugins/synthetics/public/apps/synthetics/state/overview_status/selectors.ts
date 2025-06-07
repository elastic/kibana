/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MONITOR_STATUS_ENUM } from '../../../../../common/constants/monitor_management';
import { OverviewStatusMetaData, OverviewStatusState } from '../../../../../common/runtime_types';
import { SyntheticsAppState } from '../root_reducer';

export const getStatusByConfig = (
  configId: string,
  status?: OverviewStatusState | null,
  locId?: string
) => {
  if (!status) {
    return MONITOR_STATUS_ENUM.PENDING;
  }
  const configStatus = status.downConfigs[configId] || status.upConfigs[configId];
  if (configStatus) {
    const config = configStatus?.locations.find((loc) => loc.id === locId);
    return config?.status ?? MONITOR_STATUS_ENUM.PENDING;
  } else {
    const configByIdLoc = configId + '-' + locId;
    const configS = status.downConfigs[configByIdLoc] || status.upConfigs[configByIdLoc];
    const config = configS?.locations.find((loc) => loc.id === locId);
    return config?.status ?? MONITOR_STATUS_ENUM.PENDING;
  }
};

export const selectOverviewStatus = ({ overviewStatus, overview }: SyntheticsAppState) => {
  if (overview.groupBy.field === 'monitor') {
    return overviewStatus;
  }
  if (!overviewStatus.status) {
    return overviewStatus;
  }
  const status = formatStatus(overviewStatus.status, overview.groupBy.field);
  return {
    ...overviewStatus,
    status,
  };
};

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
