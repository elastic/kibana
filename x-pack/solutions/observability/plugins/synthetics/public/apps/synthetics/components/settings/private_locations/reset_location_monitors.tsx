/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useMonitorIntegrationHealth } from '../../common/hooks/use_monitor_integration_health';

export const ResetLocationMonitors = ({
  locationId,
  setMonitorPendingReset,
}: {
  locationId: string;
  setMonitorPendingReset: (ids: string[]) => void;
}) => {
  const { getResetFixableMonitorCountForLocation, getResetFixableConfigIdsForLocation } =
    useMonitorIntegrationHealth();

  const resetFixableCount = getResetFixableMonitorCountForLocation(locationId);

  const handleReset = () => {
    const ids = getResetFixableConfigIdsForLocation(locationId);
    if (ids.length > 0) {
      setMonitorPendingReset(ids);
    }
  };

  if (resetFixableCount === 0) {
    return null;
  }

  return (
    <EuiButtonEmpty
      data-test-subj="syntheticsResetLocationMonitorsButton"
      size="s"
      iconType="refresh"
      color="warning"
      onClick={handleReset}
    >
      {RESET_MONITORS_LABEL}
    </EuiButtonEmpty>
  );
};

export const RESET_MONITORS_LABEL = i18n.translate(
  'xpack.synthetics.settingsRoute.privateLocations.resetMonitors',
  {
    defaultMessage: 'Reset monitors',
  }
);
