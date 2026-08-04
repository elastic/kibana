/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useSelector } from 'react-redux';
import { MwsCalloutContent } from './mws_callout_content';
import { selectOverviewStatus } from '../../../state/overview_status';
import { getActiveMaintenanceWindows, useFetchMaintenanceWindows } from '../../../hooks';

export const MonitorsMWsCallout = () => {
  const { allConfigs } = useSelector(selectOverviewStatus);
  const { data } = useFetchMaintenanceWindows();

  const monitorMWIds = [...new Set(allConfigs?.flatMap((config) => config.maintenanceWindows ?? []))];

  const activeMWs = getActiveMaintenanceWindows(data?.maintenanceWindows, monitorMWIds);

  if (activeMWs.length) {
    return <MwsCalloutContent activeMWs={activeMWs} />;
  }

  return null;
};
