/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useFetchActiveMaintenanceWindows } from '@kbn/alerts-ui-shared';
import { OverviewStatusMetaData } from '../../../../../../common/runtime_types';
import { ClientPluginsStart } from '../../../../../plugin';

export const useMonitorMWs = (monitor: OverviewStatusMetaData) => {
  const services = useKibana<ClientPluginsStart>().services;
  const { data } = useFetchActiveMaintenanceWindows(services, {
    enabled: true,
  });

  const monitorMWs = monitor.maintenanceWindows;

  return { activeMWs: data?.filter((mw) => monitorMWs?.includes(mw.id)) ?? [] };
};
