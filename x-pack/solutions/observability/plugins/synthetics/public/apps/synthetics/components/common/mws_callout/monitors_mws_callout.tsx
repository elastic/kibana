/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useFetchActiveMaintenanceWindows } from '@kbn/alerts-ui-shared';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useSelector } from 'react-redux';
import { ClientPluginsStart } from '../../../../../plugin';
import { selectOverviewStatus } from '../../../state/overview_status';

export const MonitorsMWsCallout = () => {
  const { allConfigs } = useSelector(selectOverviewStatus);

  const services = useKibana<ClientPluginsStart>().services;
  const { data } = useFetchActiveMaintenanceWindows(services, {
    enabled: true,
  });

  const monitorMWs = new Set(allConfigs?.flatMap((config) => config.maintenanceWindows ?? []));
  const hasMonitorMWs = monitorMWs && monitorMWs.size > 0;

  if (data?.length && hasMonitorMWs) {
    const hasActiveMWs = data.filter((mw) => monitorMWs.has(mw.id));
    if (hasActiveMWs.length) {
      return (
        <>
          <EuiCallOut
            title={i18n.translate(
              'xpack.synthetics.maintenanceWindowCallout.maintenanceWindowActive.monitors',
              {
                defaultMessage: 'Maintence windows are active',
              }
            )}
            color="warning"
            iconType="iInCircle"
            data-test-subj="maintenanceWindowCallout"
          >
            {i18n.translate(
              'xpack.synthetics.maintenanceWindowCallout.maintenanceWindowActiveDescription.monitors',
              {
                defaultMessage:
                  'Monitors are stopped while maintenance windows are running. Active maintenance windows are {titles}.',
                values: {
                  titles: hasActiveMWs.map((mw) => mw.title).join(', '),
                },
              }
            )}
          </EuiCallOut>
          <EuiSpacer size="s" />
        </>
      );
    }
  }

  return null;
};
