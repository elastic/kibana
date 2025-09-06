/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';
import { useEuiTheme } from '@elastic/eui';
import { useSelector } from 'react-redux';
import type { EncryptedSyntheticsSavedMonitor } from '../../../../../../../../common/runtime_types';
import { selectOverviewStatus } from '../../../../../state/overview_status';

export type LocationsStatus = Array<{ status: string; id: string; label: string; color: string }>;

const getColor = (euiTheme: EuiThemeComputed, status: string) => {
  const isAmsterdam = euiTheme.themeName === 'EUI_THEME_AMSTERDAM';

  switch (status) {
    case 'up':
      return isAmsterdam ? euiTheme.colors.vis.euiColorVis0 : euiTheme.colors.success;
    case 'down':
      return isAmsterdam ? euiTheme.colors.vis.euiColorVis9 : euiTheme.colors.vis.euiColorVis6;
    default:
      return euiTheme.colors.backgroundBaseSubdued;
  }
};

export function useOverviewStatusByLocation({
  configId,
  monitorLocations,
}: {
  configId: string;
  monitorLocations?: EncryptedSyntheticsSavedMonitor['locations'];
}) {
  const { euiTheme } = useEuiTheme();

  const { allConfigs, loading } = useSelector(selectOverviewStatus);
  const monOverviewConfigs = allConfigs?.filter((config) => config.configId === configId);

  const locationsStatuses: LocationsStatus =
    monitorLocations?.map((location) => {
      const locConfig = monOverviewConfigs?.find((config) => config.locationId === location.id);
      const status = locConfig?.status || 'pending';
      const label = location.label || location.id;
      const color = getColor(euiTheme, status);
      return {
        status,
        id: location.id,
        label,
        color,
      };
    }) || [];

  return {
    locationsStatuses,
    loading,
  };
}
