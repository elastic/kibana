/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OverviewStatusMetaData } from '../../../../../../common/runtime_types';
import { getActiveMaintenanceWindows, useFetchMaintenanceWindows } from '../../../hooks';

export const useMonitorMWs = (monitor: OverviewStatusMetaData) => {
  const { data } = useFetchMaintenanceWindows();

  const activeMWs = getActiveMaintenanceWindows(
    data?.maintenanceWindows,
    monitor.maintenanceWindows
  );

  return { activeMWs };
};
