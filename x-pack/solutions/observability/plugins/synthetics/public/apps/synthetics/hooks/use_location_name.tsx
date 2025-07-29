/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { OverviewStatusMetaData } from '../../../../common/runtime_types';
import { selectServiceLocationsState, getServiceLocations } from '../state';

export function useLocationName(monitor: OverviewStatusMetaData) {
  const dispatch = useDispatch();
  const { locationsLoaded, locations } = useSelector(selectServiceLocationsState);
  useEffect(() => {
    if (!locationsLoaded) {
      dispatch(getServiceLocations());
    }
  });
  const locationId = monitor.locations[0].id!;
  const locationLabel = monitor.locations[0].label;

  return useMemo(() => {
    if (!locationsLoaded || locationLabel) {
      return locationLabel ?? locationId;
    } else {
      const location = locations.find((loc) => loc.id === locationId);
      return location?.label ?? (locationLabel || locationId);
    }
  }, [locationsLoaded, locationLabel, locationId, locations]);
}
