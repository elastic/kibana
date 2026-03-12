/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { MwsCalloutContent } from './mws_callout_content';
import { MwsPendingSyncCallout } from './mws_pending_sync_callout';
import { useHasPendingMwChanges } from './use_has_pending_mw_changes';
import { selectOverviewStatus } from '../../../state/overview_status';

export const MonitorsMWsCallout = () => {
  const { allConfigs } = useSelector(selectOverviewStatus);

  const monitorMWIds = useMemo(
    () => [...new Set(allConfigs?.flatMap((config) => config.maintenanceWindows ?? []))],
    [allConfigs]
  );

  const { activeMWs, hasPendingChanges, syncInterval } = useHasPendingMwChanges(monitorMWIds);

  if (activeMWs.length) {
    return <MwsCalloutContent activeMWs={activeMWs} />;
  }

  if (hasPendingChanges) {
    return <MwsPendingSyncCallout syncInterval={syncInterval} />;
  }

  return null;
};
