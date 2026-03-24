/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiCallOut, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { MaintenanceWindow } from '@kbn/alerts-ui-shared/src/maintenance_window_callout/types';
import { MaintenanceWindowsLink } from '../../monitor_add_edit/fields/maintenance_windows/create_maintenance_windows_btn';
import { useSyncInterval } from './use_sync_interval';

export const MwsCalloutContent = ({ activeMWs }: { activeMWs: MaintenanceWindow[] }) => {
  const syncInterval = useSyncInterval();

  if (activeMWs.length) {
    return (
      <>
        <EuiCallOut
          announceOnMount
          title={i18n.translate(
            'xpack.synthetics.maintenanceWindowCallout.maintenanceWindowActive.monitors',
            {
              defaultMessage: 'Maintenance windows are active',
            }
          )}
          color="warning"
          iconType="info"
          data-test-subj="maintenanceWindowCallout"
        >
          {i18n.translate(
            'xpack.synthetics.maintenanceWindowCallout.maintenanceWindowActiveDescription.monitors',
            {
              defaultMessage:
                'Monitors are stopped while maintenance windows are running. Active maintenance windows are ',
            }
          )}
          {activeMWs.map((mws, index) => (
            <span key={mws.id}>
              <MaintenanceWindowsLink id={mws.id} label={mws.title} />
              {index !== activeMWs.length - 1 ? <span>, </span> : <span>.</span>}
            </span>
          ))}
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.synthetics.maintenanceWindowCallout.nextSyncNote"
              defaultMessage="It may take up to {syncInterval} {syncInterval, plural, one {minute} other {minutes}} for maintenance window changes to be applied to private location monitors."
              values={{ syncInterval }}
            />
          </EuiText>
        </EuiCallOut>
        <EuiSpacer size="s" />
      </>
    );
  } else {
    return null;
  }
};
