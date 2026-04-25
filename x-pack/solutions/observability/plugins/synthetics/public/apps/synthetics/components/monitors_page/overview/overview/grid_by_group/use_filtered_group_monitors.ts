/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from 'react-redux';
import { selectOverviewStatus } from '../../../../../state/overview_status';
import { getConfigStatusByLocation, useGetUrlParams } from '../../../../../hooks';
import type { OverviewStatusMetaData } from '../../../../../../../../common/runtime_types';

export const useFilteredGroupMonitors = ({
  groupMonitors,
}: {
  groupMonitors: OverviewStatusMetaData[];
}) => {
  const { status: overviewStatus } = useSelector(selectOverviewStatus);
  const { statusFilter } = useGetUrlParams();

  if (statusFilter === 'all' || !statusFilter) return groupMonitors;

  if (statusFilter === 'disabled') return groupMonitors.filter((monitor) => !monitor.isEnabled);

  return groupMonitors.filter((monitor) => {
    const locationId = monitor.locations[0]?.id;
    if (!locationId) return false;

    const status = getConfigStatusByLocation(overviewStatus, monitor.configId, locationId);
    if (statusFilter === 'up' && status.status === 'up') {
      return true;
    } else if (statusFilter === 'down' && status.status === 'down') {
      return true;
    }
    return false;
  });
};
