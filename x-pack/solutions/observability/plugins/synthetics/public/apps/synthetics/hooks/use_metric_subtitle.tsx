/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { OverviewStatusMetaData } from '../../../../common/runtime_types';
import { selectServiceLocationsState, getServiceLocations } from '../state';

export function useMetricSubtitle(monitor: OverviewStatusMetaData) {
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
    const downLocations = monitor.locations.filter((location) => location.status === 'down');
    if (downLocations.length === 1) {
      return i18n.translate('xpack.synthetics.monitorStatus.downLocationLabel', {
        defaultMessage: 'Down in {location}',
        values: { location: downLocations[0].label ?? downLocations[0].id },
      });
    } else if (downLocations.length > 1) {
      return i18n.translate('xpack.synthetics.monitorStatus.downLocationsLabel', {
        defaultMessage: 'Down in {number} locations',
        values: {
          number: downLocations.length,
        },
      });
    }
    const upLocations = monitor.locations.filter((location) => location.status === 'up');

    if (upLocations.length === 1) {
      return i18n.translate('xpack.synthetics.monitorStatus.upLocationLabel', {
        defaultMessage: 'Up in {location}',
        values: { location: upLocations[0].label ?? upLocations[0].id },
      });
    } else if (upLocations.length > 1) {
      return i18n.translate('xpack.synthetics.monitorStatus.upLocationsLabel', {
        defaultMessage: 'Up in {number} locations',
        values: {
          number: upLocations.length,
        },
      });
    }

    const pendingLocations = monitor.locations.filter((location) => location.status === 'pending');

    if (pendingLocations.length === 1) {
      return i18n.translate('xpack.synthetics.monitorStatus.pendingLocationLabel', {
        defaultMessage: 'Pending in {location}',
        values: { location: pendingLocations[0].label ?? pendingLocations[0].id },
      });
    } else if (pendingLocations.length > 1) {
      return i18n.translate('xpack.synthetics.monitorStatus.pendingLocationsLabel', {
        defaultMessage: 'Pending in {number} locations',
        values: {
          number: pendingLocations.length,
        },
      });
    }

    if (!locationsLoaded || locationLabel) {
      return locationLabel ?? locationId;
    } else {
      const location = locations.find((loc) => loc.id === locationId);
      return location?.label ?? (locationLabel || locationId);
    }
  }, [monitor.locations, locationsLoaded, locationLabel, locationId, locations]);
}
