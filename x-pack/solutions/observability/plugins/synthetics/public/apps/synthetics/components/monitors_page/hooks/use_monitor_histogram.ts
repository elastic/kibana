/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMonitorHistogramPerMonitor } from './use_monitor_histogram_per_monitor';
import { useGetUrlParams } from '../../../hooks';
import { OverviewStatusMetaData } from '../../../../../../common/runtime_types';
import { useMonitorHistogramPerLocation } from './use_monitor_histogram_per_location';

export const useMonitorHistogram = ({ items }: { items: OverviewStatusMetaData[] }) => {
  const { groupBy } = useGetUrlParams();
  const isGroupByMonitor = groupBy === 'monitor';

  const perLocation = useMonitorHistogramPerLocation({
    items,
    isReady: !isGroupByMonitor,
  });
  const perMonitor = useMonitorHistogramPerMonitor({
    items,
    isReady: isGroupByMonitor,
  });
  return isGroupByMonitor ? perMonitor : perLocation;
};
