/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMonitorHistogramPerMonitor } from './use_monitor_histogram_per_monitor';
import { useGetUrlParams } from '../../../hooks';
import type { OverviewStatusMetaData } from '../../../../../../common/runtime_types';
import { useMonitorHistogramPerLocation } from './use_monitor_histogram_per_location';

export const useMonitorHistogram = ({
  items,
  enabled = true,
}: {
  items: OverviewStatusMetaData[];
  /**
   * Skip the underlying ES search entirely (e.g. when the column hosting
   * the sparkline is hidden because the flyout is open). The cached data
   * survives the gap, so re-enabling doesn't force a refetch on its own.
   */
  enabled?: boolean;
}) => {
  const { groupBy } = useGetUrlParams();
  const isGroupByMonitor = groupBy === 'monitor';

  const perLocation = useMonitorHistogramPerLocation({
    items,
    isReady: enabled && !isGroupByMonitor,
  });
  const perMonitor = useMonitorHistogramPerMonitor({
    items,
    isReady: enabled && isGroupByMonitor,
  });
  return isGroupByMonitor ? perMonitor : perLocation;
};
