/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useFetchActiveMaintenanceWindows } from '@kbn/alerts-ui-shared';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { MwsCalloutContent } from './mws_callout_content';
import { ConfigKey } from '../../../../../../common/runtime_types';
import { useSelectedMonitor } from '../../monitor_details/hooks/use_selected_monitor';
import { ClientPluginsStart } from '../../../../../plugin';

export const MonitorMWsCallout = () => {
  const { monitor } = useSelectedMonitor();

  const services = useKibana<ClientPluginsStart>().services;
  const { data } = useFetchActiveMaintenanceWindows(services, {
    enabled: true,
  });
  if (!monitor) {
    return null;
  }
  const monitorMWs = monitor[ConfigKey.MAINTENANCE_WINDOWS];
  const hasMonitorMWs = monitorMWs && monitorMWs.length > 0;

  if (data?.length && hasMonitorMWs) {
    const activeMWs = data.filter((mw) => monitorMWs.includes(mw.id));
    if (activeMWs) {
      return <MwsCalloutContent activeMWs={activeMWs} />;
    }
  }

  return null;
};
