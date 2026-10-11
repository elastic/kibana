/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useSelector } from 'react-redux-v7';
import { MwsCalloutContent } from './mws_callout_content';
import { MwsPendingSyncCallout } from './mws_pending_sync_callout';
import { MwsAgentVersionCallout } from './mws_agent_version_callout';
import { useHasPendingMwChanges } from './use_has_pending_mw_changes';
import { useOutdatedMwAgentLocationIds } from './use_outdated_mw_agent_locations';
import { selectOverviewStatus } from '../../../state/overview_status';

export const MonitorsMWsCallout = () => {
  const { allConfigs } = useSelector(selectOverviewStatus);
  const { outdatedLocationIds } = useOutdatedMwAgentLocationIds();

  const monitorMWIds = useMemo(
    () => [...new Set(allConfigs?.flatMap((config) => config.maintenanceWindows ?? []))],
    [allConfigs]
  );

  // Folded into whichever MW callout is already showing below. Only when
  // neither active nor pending applies does it get its own callout.
  const hasOutdatedAgent = useMemo(
    () =>
      outdatedLocationIds.size > 0 &&
      (allConfigs ?? []).some(
        (config) =>
          (config.maintenanceWindows?.length ?? 0) > 0 &&
          config.locations.some((location) => outdatedLocationIds.has(location.id))
      ),
    [allConfigs, outdatedLocationIds]
  );

  const { activeMWs, hasPendingChanges, syncInterval } = useHasPendingMwChanges(monitorMWIds);

  if (activeMWs.length) {
    return <MwsCalloutContent activeMWs={activeMWs} hasOutdatedAgent={hasOutdatedAgent} />;
  }

  if (hasPendingChanges) {
    return (
      <MwsPendingSyncCallout syncInterval={syncInterval} hasOutdatedAgent={hasOutdatedAgent} />
    );
  }

  if (hasOutdatedAgent) {
    return <MwsAgentVersionCallout />;
  }

  return null;
};
