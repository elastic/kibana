/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import React from 'react';
import type {
  OverviewStatusState,
  ServiceLocations,
} from '../../../../../../../common/runtime_types';
import { LocationStatusBadges } from '../../../common/components/location_status_badges';

interface Props {
  locations: ServiceLocations;
  monitorId: string;
  overviewStatus: OverviewStatusState | null;
}

export const MonitorLocations = ({ locations, monitorId, overviewStatus }: Props) => {
  const { euiTheme } = useEuiTheme();

  const locationsToDisplay = locations.map((loc) => {
    const locById = `${monitorId}-${loc.id}`;

    let status: string = 'unknown';
    let color = euiTheme.colors.disabled;

    if (overviewStatus?.downConfigs[locById]) {
      status = 'down';
      color = euiTheme.colors.danger;
    } else if (overviewStatus?.upConfigs[locById]) {
      status = 'up';
      color = euiTheme.colors.success;
    }

    return {
      id: loc.id,
      label: loc.label ?? loc.id,
      status,
      color,
    };
  });

  return (
    <LocationStatusBadges configId={monitorId} locations={locationsToDisplay} loading={false} />
  );
};
