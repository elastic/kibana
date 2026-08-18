/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MwsCalloutContent } from './mws_callout_content';
import { ConfigKey } from '../../../../../../common/runtime_types';
import { useSelectedMonitor } from '../../monitor_details/hooks/use_selected_monitor';
import { getActiveMaintenanceWindows, useFetchMaintenanceWindows } from '../../../hooks';

export const MonitorMWsCallout = () => {
  const { monitor } = useSelectedMonitor();
  const { data } = useFetchMaintenanceWindows();

  const activeMWs = getActiveMaintenanceWindows(
    data?.maintenanceWindows,
    monitor?.[ConfigKey.MAINTENANCE_WINDOWS]
  );

  if (activeMWs.length) {
    return <MwsCalloutContent activeMWs={activeMWs} />;
  }

  return null;
};
