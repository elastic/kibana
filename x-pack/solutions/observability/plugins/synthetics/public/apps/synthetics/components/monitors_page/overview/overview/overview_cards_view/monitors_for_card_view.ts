/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OverviewStatusMetaData } from '../../../../../../../../common/runtime_types';
import type { GroupByState } from '../../../../../state/overview/models';

/**
 * Paginated overview status is one row per config. The default card view
 * renders one card per location (same shape `formatStatus` produces when
 * group-by is not monitor). Group by monitor keeps every location on one card.
 */
export const monitorsForCardView = (
  monitors: OverviewStatusMetaData[],
  groupField: GroupByState['field']
): OverviewStatusMetaData[] => {
  if (groupField === 'monitor') {
    return monitors;
  }
  return expandByLocation(monitors);
};

const expandByLocation = (monitors: OverviewStatusMetaData[]): OverviewStatusMetaData[] => {
  const expanded: OverviewStatusMetaData[] = [];
  for (const monitor of monitors) {
    if ((monitor.locations?.length ?? 0) <= 1) {
      expanded.push(monitor);
      continue;
    }
    for (const location of monitor.locations) {
      expanded.push({ ...monitor, overallStatus: location.status, locations: [location] });
    }
  }
  return expanded;
};
