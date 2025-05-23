/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useSelector } from 'react-redux';
import { MONITOR_STATUS_ENUM } from '../../../../../../../common/constants/monitor_management';
import { useMonitorHealthColor } from '../../hooks/use_monitor_health_color';
import {
  OverviewStatusMetaData,
  ServiceLocations,
} from '../../../../../../../common/runtime_types';
import { LocationStatusBadges } from '../../../common/components/location_status_badges';
import { getStatusByConfig, selectOverviewStatus } from '../../../../state/overview_status';

interface Props {
  locationsWithStatus?: OverviewStatusMetaData['locations'];
  locations?: ServiceLocations;
  configId: string;
}

export const MonitorLocations = ({ locationsWithStatus, locations, configId }: Props) => {
  const { status: overviewStatus } = useSelector(selectOverviewStatus);

  const getColor = useMonitorHealthColor();
  if (locationsWithStatus) {
    const locationsToDisplay = locationsWithStatus.map((loc) => {
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
  } else {
    const locationsToDisplay =
      locations?.map((loc) => {
        const status = getStatusByConfig(configId, overviewStatus, loc.id);

        const color = getColor(status);

        return {
          status,
          color,
          id: loc.id,
          label: loc.label ?? loc.id,
        };
      }) ?? [];
    return (
      <LocationStatusBadges configId={configId} locations={locationsToDisplay} loading={true} />
    );
  }
};
