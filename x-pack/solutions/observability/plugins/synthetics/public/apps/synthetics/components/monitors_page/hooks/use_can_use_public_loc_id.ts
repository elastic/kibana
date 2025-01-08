/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from 'react-redux';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { selectServiceLocationsState } from '../../../state';
import { selectOverviewStatus } from '../../../state/overview_status';
import { useEnablement } from '../../../hooks';

export const useCanUsePublicLocById = (configId: string) => {
  const { allConfigs } = useSelector(selectOverviewStatus);

  const { isServiceAllowed } = useEnablement();

  const { locations: allLocations } = useSelector(selectServiceLocationsState);

  const listIds = allLocations?.filter((loc) => loc.isServiceManaged).map((loc) => loc.id) ?? [];

  const hasManagedLocation = allConfigs?.filter(
    (mon) => mon.configId === configId && listIds.includes(mon.locationId)
  );

  const canUsePublicLocations =
    useKibana().services?.application?.capabilities.uptime.elasticManagedLocationsEnabled ?? true;

  if (!isServiceAllowed) {
    return false;
  }

  return hasManagedLocation ? !!canUsePublicLocations : true;
};
