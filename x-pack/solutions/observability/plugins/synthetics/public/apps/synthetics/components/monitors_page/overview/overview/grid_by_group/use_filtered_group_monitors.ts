/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useGetUrlParams } from '../../../../../hooks';
import type { OverviewStatusMetaData } from '../../../../../../../../common/runtime_types';

export const useFilteredGroupMonitors = ({
  groupMonitors,
}: {
  groupMonitors: OverviewStatusMetaData[];
}) => {
  const { statusFilter } = useGetUrlParams();

  if (statusFilter === 'all' || !statusFilter) return groupMonitors;

  if (statusFilter === 'disabled') return groupMonitors.filter((monitor) => !monitor.isEnabled);

  return groupMonitors.filter((monitor) => {
    if (monitor.locations.length <= 1) {
      return monitor.overallStatus === statusFilter;
    }
    if (statusFilter === 'down') {
      return monitor.locations.some((loc) => loc.status === 'down');
    }
    if (statusFilter === 'up') {
      return monitor.overallStatus === 'up';
    }
    return false;
  });
};
