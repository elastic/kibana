/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useFetchActiveMaintenanceWindows } from '@kbn/alerts-ui-shared';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useSelector } from 'react-redux';
import { MwsCalloutContent } from './mws_callout_content';
import { MwsPendingSyncCallout } from './mws_pending_sync_callout';
import { useMwPendingSync } from './use_mw_pending_sync';
import type { ClientPluginsStart } from '../../../../../plugin';
import { selectOverviewStatus } from '../../../state/overview_status';

export const MonitorsMWsCallout = () => {
  const { allConfigs } = useSelector(selectOverviewStatus);

  const services = useKibana<ClientPluginsStart>().services;
  const { data } = useFetchActiveMaintenanceWindows(services, {
    enabled: true,
  });

  const monitorMWs = new Set(allConfigs?.flatMap((config) => config.maintenanceWindows ?? []));
  const hasMonitorMWs = monitorMWs && monitorMWs.size > 0;

  const activeMWs = hasMonitorMWs && data?.length ? data.filter((mw) => monitorMWs.has(mw.id)) : [];

  const activeIdsKey = activeMWs
    .map((mw) => mw.id)
    .sort()
    .join(',');

  const { showPendingSync, syncInterval } = useMwPendingSync({ activeIdsKey, hasMonitorMWs });

  if (activeMWs.length) {
    return <MwsCalloutContent activeMWs={activeMWs} />;
  }

  if (showPendingSync) {
    return <MwsPendingSyncCallout syncInterval={syncInterval} />;
  }

  return null;
};
