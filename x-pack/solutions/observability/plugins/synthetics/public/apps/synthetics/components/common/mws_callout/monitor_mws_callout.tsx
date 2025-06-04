/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useFetchActiveMaintenanceWindows } from '@kbn/alerts-ui-shared';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useParams } from 'react-router-dom';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ConfigKey } from '../../../../../../common/runtime_types';
import { useSelectedMonitor } from '../../monitor_details/hooks/use_selected_monitor';
import { ClientPluginsStart } from '../../../../../plugin';

export const MonitorMWsCallout = () => {
  const { monitorId } = useParams<{ monitorId: string }>();
  const { monitor } = useSelectedMonitor();

  const services = useKibana<ClientPluginsStart>().services;
  const { data } = useFetchActiveMaintenanceWindows(services, {
    enabled: true,
  });
  if (!monitorId || !monitor) {
    return null;
  }
  const monitorMWs = monitor[ConfigKey.MAINTENANCE_WINDOWS];
  const hasMonitorMWs = monitorMWs && monitorMWs.length > 0;

  if (data?.length && hasMonitorMWs) {
    const hasActiveMWs = data.filter((mw) => monitorMWs.includes(mw.id));
    if (hasActiveMWs) {
      return (
        <>
          <EuiCallOut
            title={i18n.translate(
              'xpack.synthetics.maintenanceWindowCallout.maintenanceWindowActive',
              {
                defaultMessage:
                  '{activeWindowCount, plural, one {A maintenance window is} other {Maintenance windows are}} active for this monitor',
                values: {
                  activeWindowCount: hasActiveMWs.length,
                },
              }
            )}
            color="warning"
            iconType="iInCircle"
            data-test-subj="maintenanceWindowCallout"
          >
            {i18n.translate(
              'xpack.synthetics.maintenanceWindowCallout.maintenanceWindowActiveDescription',
              {
                defaultMessage:
                  'Monitor is stopped while maintenance windows are running. Active maintenance windows are {titles}.',
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
