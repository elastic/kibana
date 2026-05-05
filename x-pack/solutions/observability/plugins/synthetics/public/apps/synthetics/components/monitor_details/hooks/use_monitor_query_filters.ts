/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { UrlFilter } from '@kbn/exploratory-view-plugin/public';
import { SYNTHETICS_INDEX_PATTERN } from '../../../../../../common/constants';
import { useMonitorQueryId } from './use_monitor_query_id';
import { useSelectedLocation } from './use_selected_location';
import { useGetUrlParams } from '../../../hooks';
import { useMonitorLatestPing } from './use_monitor_latest_ping';

export const useMonitorQueryFilters = (): {
  queryIdFilter?: Record<string, string[]>;
  locationFilter?: UrlFilter[];
  dataTypesIndexPatterns?: Record<string, string>;
} => {
  const selectedLocation = useSelectedLocation();
  const { remoteName, locationId: urlLocationId } = useGetUrlParams();
  const { latestPing } = useMonitorLatestPing();

  const localMonitorQueryId = useMonitorQueryId();

  // For remote monitors, the location is not in the local locations list so
  // selectedLocation is null. Derive the location label from the latest ping's
  // observer.geo.name field, which is the canonical location label in ping docs.
  const pingLocationLabel = latestPing?.observer?.geo?.name;

  // The embeddable filters ping docs by `monitor.id`. For project monitors
  // the ping's `monitor.id` is the project-script id, not the local
  // `configId` we derive from the URL — so for remote monitors we must use
  // the actual `monitor.id` carried by the latest ping. Otherwise the
  // aggregations return zero hits and the panels render "(null)".
  const pingMonitorId = latestPing?.monitor?.id;
  const monitorQueryId = isRemote ? pingMonitorId : localMonitorQueryId;

  return useMemo(() => {
    if (!monitorQueryId) {
      return {};
    }

    // For remote monitors, the location may not be resolvable from the local
    // locations list. Fall back to using the URL locationId for filtering.
    const hasLocation = selectedLocation || urlLocationId;
    if (!hasLocation) {
      return {};
    }

    // Build location filter values. For local monitors, pass both label and id
    // because in 8.6.0, observer.geo.name was mapped to the id. For remote
    // monitors, we need the actual observer.geo.name value from the ping data
    // because urlLocationId is the location ID (e.g. "us-east4-a") but the
    // observer.geo.name field contains the label (e.g. "North America - US East").
    let locationFilterValues: string[];
    if (selectedLocation) {
      locationFilterValues = [selectedLocation.label, selectedLocation.id];
    } else if (pingLocationLabel) {
      // Remote monitor with ping data available: use the actual label
      // from observer.geo.name plus the ID for backwards compat with
      // pre-8.6 data where observer.geo.name contained the ID.
      const values = new Set<string>();
      values.add(pingLocationLabel);
      if (urlLocationId) values.add(urlLocationId);
      locationFilterValues = [...values];
    } else {
      // Remote monitor but ping hasn't loaded yet — don't render the
      // embeddables with a filter that won't match. Return empty so the
      // consuming components show nothing until we have the correct label.
      return {};
    }

    return {
      queryIdFilter: {
        'monitor.id': [monitorQueryId],
      },
      locationFilter: [
        {
          field: 'observer.geo.name',
          values: locationFilterValues,
        },
      ],
      // For remote monitors, override the index pattern to use CCS syntax
      ...(remoteName
        ? {
            dataTypesIndexPatterns: {
              synthetics: `${remoteName}:${SYNTHETICS_INDEX_PATTERN}`,
            },
          }
        : {}),
    };
  }, [monitorQueryId, selectedLocation, remoteName, urlLocationId, pingLocationLabel]);
};
