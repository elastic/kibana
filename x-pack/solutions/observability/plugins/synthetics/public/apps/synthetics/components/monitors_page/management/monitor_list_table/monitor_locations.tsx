/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MONITOR_STATUS_ENUM } from '../../../../../../../common/constants/monitor_management';
import { useMonitorHealthColor } from '../../hooks/use_monitor_health_color';
import {
  OverviewStatusMetaData,
  ServiceLocations,
} from '../../../../../../../common/runtime_types';
import { LocationStatusBadges } from '../../../common/components/location_status_badges';

interface Props {
  locations: ServiceLocations | OverviewStatusMetaData['locations'];
  configId: string;
}

export const MonitorLocations = ({ locations, configId }: Props) => {
  const getColor = useMonitorHealthColor();

  const locationsToDisplay = locations.map((loc) => {
    const status = loc.status ?? MONITOR_STATUS_ENUM.PENDING;
    const color = getColor(status);

    return {
      status,
      color,
      id: loc.id,
      label: loc.label ?? loc.id,
    };
  });

  return (
    <LocationStatusBadges configId={configId} locations={locationsToDisplay} loading={false} />
  );
};
