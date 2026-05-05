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
  // `selectedLocation` should be null — but `useSelectedLocation` resolves
  // against the *local* locations list and may match by ID, returning a local
  // location whose label differs from the remote ping's `observer.geo.name`.
  // We therefore ignore `selectedLocation` entirely when `remoteName` is set,
  // and require the ping-derived label before rendering. This avoids a race
  // where embeddables briefly query with the wrong label and render
  // "(null)" until the ping resolves.
  const isRemote = Boolean(remoteName);
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

    let locationFilterValues: string[];
    if (isRemote) {
      // Remote monitor: only render once we have the canonical
      // `observer.geo.name` from a ping. The URL `locationId` alone is
      // unreliable because the embeddable filters by `observer.geo.name`
      // (a label), not the location id.
      if (!pingLocationLabel) {
        return {};
      }
      const values = new Set<string>();
      values.add(pingLocationLabel);
      if (urlLocationId) values.add(urlLocationId);
      locationFilterValues = [...values];
    } else {
      // Local monitor: use the resolved selected location. Pass both label
      // and id because pre-8.6 data mapped `observer.geo.name` to the id.
      if (!selectedLocation) {
        return {};
      }
      locationFilterValues = [selectedLocation.label, selectedLocation.id];
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
      // Remote monitors live on the remote cluster's synthetics indices.
      ...(isRemote
        ? {
            dataTypesIndexPatterns: {
              synthetics: `${remoteName}:${SYNTHETICS_INDEX_PATTERN}`,
            },
          }
        : {}),
    };
  }, [monitorQueryId, selectedLocation, isRemote, remoteName, urlLocationId, pingLocationLabel]);
};
