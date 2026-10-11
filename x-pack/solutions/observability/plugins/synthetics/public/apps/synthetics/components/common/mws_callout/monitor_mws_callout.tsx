/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MwsCalloutContent } from './mws_callout_content';
import { MwsPendingSyncCallout } from './mws_pending_sync_callout';
import { MwsAgentVersionCallout } from './mws_agent_version_callout';
import { useHasPendingMwChanges } from './use_has_pending_mw_changes';
import { useOutdatedMwAgentLocationIds } from './use_outdated_mw_agent_locations';
import { ConfigKey, isExternalSyntheticsMonitor } from '../../../../../../common/runtime_types';
import { useSelectedMonitor } from '../../monitor_details/hooks/use_selected_monitor';

export const MonitorMWsCallout = () => {
  const { monitor } = useSelectedMonitor();
  const { outdatedLocationIds } = useOutdatedMwAgentLocationIds();

  // Maintenance window assignments live on the local saved object. Read-only
  // (remote / heartbeat) monitors expose no MW data, so skip the callout for them.
  const monitorMWIds =
    monitor && !isExternalSyntheticsMonitor(monitor)
      ? monitor[ConfigKey.MAINTENANCE_WINDOWS] ?? []
      : [];
  const { activeMWs, hasPendingChanges, syncInterval } = useHasPendingMwChanges(monitorMWIds);

  if (!monitor || isExternalSyntheticsMonitor(monitor)) {
    return null;
  }

  const hasOutdatedAgent =
    monitorMWIds.length > 0 &&
    (monitor.locations ?? []).some((location) => outdatedLocationIds.has(location.id));

  // Folded into whichever of these is already showing (rather than a
  // separate callout) to keep the page to a single MW-related box. Only
  // when none apply does the outdated agent get its own callout below.
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
