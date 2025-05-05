/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import React from 'react';
import { useSelector } from 'react-redux';
import { useMonitorHealthColor } from '../../hooks/use_monitor_health_color';
import {
  OverviewStatusMetaData,
  ServiceLocations,
} from '../../../../../../../common/runtime_types';
import { LocationStatusBadges } from '../../../common/components/location_status_badges';
import { selectOverviewStatus } from '../../../../state/overview_status';

interface Props {
  locations: ServiceLocations | OverviewStatusMetaData['locations'];
  configId: string;
}

export const MonitorLocations = ({ locations, configId }: Props) => {
  const { euiTheme } = useEuiTheme();
  const { status: overviewStatus } = useSelector(selectOverviewStatus);

  const getColor = useMonitorHealthColor();

  const locationsToDisplay = locations.map((loc) => {
    let status: string = 'unknown';
    let color = euiTheme.colors.disabled;
    if (overviewStatus?.downConfigs[configId]) {
      const configStatus = overviewStatus.downConfigs[configId];
      const locStatus = configStatus?.locations?.find((location) => location.id === loc.id)?.status;
      if (locStatus) {
        status = locStatus;
        color = getColor(status);
      }
    }
    if (overviewStatus?.upConfigs[configId]) {
      const configStatus = overviewStatus.upConfigs[configId];
      const locStatus = configStatus?.locations?.find((location) => location.id === loc.id)?.status;
      if (locStatus) {
        status = locStatus;
        color = getColor(status);
      }
    }

    return {
      id: loc.id,
      label: loc.label ?? loc.id,
      status,
      color,
    };
  });

  return (
    <LocationStatusBadges configId={configId} locations={locationsToDisplay} loading={false} />
  );
};
