/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useSelector } from 'react-redux';
import { MwsCalloutContent } from './mws_callout_content';
import { MwsAgentVersionCallout } from './mws_agent_version_callout';
import { useOutdatedMwAgentLocationIds } from './use_outdated_mw_agent_locations';
import { selectOverviewStatus } from '../../../state/overview_status';
import { getActiveMaintenanceWindows, useFetchMaintenanceWindows } from '../../../hooks';

export const MonitorsMWsCallout = () => {
  const { allConfigs } = useSelector(selectOverviewStatus);
  const { data } = useFetchMaintenanceWindows();
  const { outdatedLocationIds } = useOutdatedMwAgentLocationIds();

  const monitorMWIds = [
    ...new Set(allConfigs?.flatMap((config) => config.maintenanceWindows ?? [])),
  ];

  const activeMWs = getActiveMaintenanceWindows(data?.maintenanceWindows, monitorMWIds);

  const hasOutdatedAgent =
    outdatedLocationIds.size > 0 &&
    (allConfigs ?? []).some(
      (config) =>
        (config.maintenanceWindows?.length ?? 0) > 0 && outdatedLocationIds.has(config.locationId)
    );

  if (activeMWs.length) {
    return <MwsCalloutContent activeMWs={activeMWs} hasOutdatedAgent={hasOutdatedAgent} />;
  }

  if (hasOutdatedAgent) {
    return <MwsAgentVersionCallout />;
  }

  return null;
};
