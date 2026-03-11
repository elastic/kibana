/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useCallback } from 'react';
import { useMonitorIntegrationHealth } from '../../common/hooks/use_monitor_integration_health';

export const ResetLocationMonitors = ({ locationId }: { locationId: string }) => {
  const {
    getUnhealthyMonitorCountForLocation,
    getUnhealthyConfigIdsForLocation,
    resetMonitors,
    isResetting,
  } = useMonitorIntegrationHealth();

  const unhealthyMonitorCount = getUnhealthyMonitorCountForLocation(locationId);

  const handleReset = useCallback(async () => {
    const ids = getUnhealthyConfigIdsForLocation(locationId);
    if (ids.length > 0) {
      await resetMonitors(ids);
    }
  }, [locationId, getUnhealthyConfigIdsForLocation, resetMonitors]);

  if (unhealthyMonitorCount === 0) {
    return null;
  }

  return (
    <EuiButtonEmpty
      data-test-subj="syntheticsResetLocationMonitorsButton"
      size="s"
      iconType="refresh"
      color="warning"
      isLoading={isResetting}
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
