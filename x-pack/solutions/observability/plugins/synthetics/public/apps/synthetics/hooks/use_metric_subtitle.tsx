/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { i18n } from '@kbn/i18n';
import type { OverviewStatusMetaData } from '../../../../common/runtime_types';
import { selectServiceLocationsState, getServiceLocations } from '../state';

const STATUS_SUBTITLE_MAP: Record<
  string,
  (locations: OverviewStatusMetaData['locations']) => string | undefined
> = {
  down: (locs) => {
    const filtered = locs.filter((loc) => loc.status === 'down');
    if (filtered.length === 1) {
      return i18n.translate('xpack.synthetics.monitorStatus.downLocationLabel', {
        defaultMessage: 'Down in {location}',
        values: { location: filtered[0].label ?? filtered[0].id },
      });
    } else if (filtered.length > 1) {
      return i18n.translate('xpack.synthetics.monitorStatus.downLocationsLabel', {
        defaultMessage: 'Down in {number} locations',
        values: { number: filtered.length },
      });
    }
  },
  up: (locs) => {
    const filtered = locs.filter((loc) => loc.status === 'up');
    if (filtered.length === 1) {
      return i18n.translate('xpack.synthetics.monitorStatus.upLocationLabel', {
        defaultMessage: 'Up in {location}',
        values: { location: filtered[0].label ?? filtered[0].id },
      });
    } else if (filtered.length > 1) {
      return i18n.translate('xpack.synthetics.monitorStatus.upLocationsLabel', {
        defaultMessage: 'Up in {number} locations',
        values: { number: filtered.length },
      });
    }
  },
  pending: (locs) => {
    const filtered = locs.filter((loc) => loc.status === 'pending');
    if (filtered.length === 1) {
      return i18n.translate('xpack.synthetics.monitorStatus.pendingLocationLabel', {
        defaultMessage: 'Pending in {location}',
        values: { location: filtered[0].label ?? filtered[0].id },
      });
    } else if (filtered.length > 1) {
      return i18n.translate('xpack.synthetics.monitorStatus.pendingLocationsLabel', {
        defaultMessage: 'Pending in {number} locations',
        values: { number: filtered.length },
      });
    }
  },
};

export function useMetricSubtitle(monitor: OverviewStatusMetaData) {
  const dispatch = useDispatch();
  const { locationsLoaded, locations } = useSelector(selectServiceLocationsState);
  useEffect(() => {
    if (!locationsLoaded) {
      dispatch(getServiceLocations());
    }
  }, [dispatch, locationsLoaded]);
  const locationId = monitor.locations[0]?.id ?? '';
  const locationLabel = monitor.locations[0]?.label;

  return useMemo(() => {
    for (const status of ['down', 'up', 'pending'] as const) {
      const subtitle = STATUS_SUBTITLE_MAP[status](monitor.locations);
      if (subtitle) return subtitle;
    }

    if (!locationsLoaded || locationLabel) {
      return locationLabel ?? locationId;
    }
    const location = locations.find((loc) => loc.id === locationId);
    return location?.label ?? (locationLabel || locationId);
  }, [monitor.locations, locationsLoaded, locationLabel, locationId, locations]);
}
