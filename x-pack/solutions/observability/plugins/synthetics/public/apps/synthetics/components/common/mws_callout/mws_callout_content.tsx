/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { EuiCallOut, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { MaintenanceWindow } from '@kbn/alerts-ui-shared/src/maintenance_window_callout/types';
import { MaintenanceWindowsLink } from '../../monitor_add_edit/fields/maintenance_windows/create_maintenance_windows_btn';
import { selectDynamicSettings } from '../../../state/settings/selectors';
import { getDynamicSettingsAction } from '../../../state/settings/actions';
import { DYNAMIC_SETTINGS_DEFAULTS } from '../../../../../../common/constants/settings_defaults';

export const MwsCalloutContent = ({ activeMWs }: { activeMWs: MaintenanceWindow[] }) => {
  const dispatch = useDispatch();
  const { settings } = useSelector(selectDynamicSettings);

  useEffect(() => {
    if (!settings) {
      dispatch(getDynamicSettingsAction.get());
    }
  }, [dispatch, settings]);

  const syncInterval =
    settings?.privateLocationsSyncInterval ??
    DYNAMIC_SETTINGS_DEFAULTS.privateLocationsSyncInterval ??
    5;

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
              defaultMessage="Maintenance window changes are applied to private location monitors within {syncInterval} {syncInterval, plural, one {minute} other {minutes}}."
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
