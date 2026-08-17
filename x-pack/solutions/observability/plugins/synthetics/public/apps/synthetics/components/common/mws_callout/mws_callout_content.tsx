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
import type { SyntheticsMaintenanceWindow } from '../../../hooks';
import { MaintenanceWindowsLink } from '../../monitor_add_edit/fields/maintenance_windows/create_maintenance_windows_btn';
import { MIN_MW_SUPPORTED_AGENT_VERSION } from '../../../../../../common/utils/agent_mw_support';
import { useSyncInterval } from './use_sync_interval';
import { SyncNowLink } from './sync_now_link';

export const MwsCalloutContent = ({
  activeMWs,
  hasOutdatedAgent = false,
}: {
  activeMWs: SyntheticsMaintenanceWindow[];
  /** Adds a line noting that an outdated agent may keep running through this monitor's active window, instead of a separate callout — keeps this surface to one box. */
  hasOutdatedAgent?: boolean;
}) => {
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
              defaultMessage="It may take up to {syncInterval} {syncInterval, plural, one {minute} other {minutes}} for maintenance window changes to be applied to private location monitors. {syncNowLink}"
              values={{ syncInterval, syncNowLink: <SyncNowLink /> }}
            />
          </EuiText>
          {hasOutdatedAgent && (
            <EuiText size="xs" data-test-subj="maintenanceWindowAgentVersionWarningLine">
              <FormattedMessage
                id="xpack.synthetics.maintenanceWindowCallout.agentVersionWarningLine"
                defaultMessage="One or more agents serving this monitor predate {minVersion} and don't support maintenance windows — this monitor may keep running during this window until they're upgraded."
                values={{ minVersion: MIN_MW_SUPPORTED_AGENT_VERSION }}
              />
            </EuiText>
          )}
        </EuiCallOut>
        <EuiSpacer size="s" />
      </>
    );
  } else {
    return null;
  }
};
