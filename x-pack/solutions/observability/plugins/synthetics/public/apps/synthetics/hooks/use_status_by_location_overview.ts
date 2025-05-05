/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from 'react-redux';
import { OverviewStatusState } from '../../../../common/runtime_types';
import { selectOverviewStatus } from '../state/overview_status';

export function useStatusByLocationOverview({
  configId,
  locationId,
}: {
  configId: string;
  locationId: string;
}) {
  const { status } = useSelector(selectOverviewStatus);

  return getConfigStatusByLocation(status, configId, locationId);
}

export const getConfigStatusByLocation = (
  status: OverviewStatusState | null,
  configId: string,
  locationId: string
) => {
  const configIdByLocation = `${configId}-${locationId}`;

  if (!status) {
    return { status: 'unknown', configIdByLocation };
  }
  const config = status.upConfigs[configId] || status.downConfigs[configId];
  const monitorStatus = config?.locations?.find((location) => location.id === locationId)?.status;

  return {
    configIdByLocation,
    status: monitorStatus || 'unknown',
    timestamp: config?.timestamp,
  };
};
