/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { UrlFilter } from '@kbn/exploratory-view-plugin/public';
import { useMonitorQueryId } from './use_monitor_query_id';
import { useSelectedLocation } from './use_selected_location';

export const useMonitorQueryFilters = (): {
  queryIdFilter?: Record<string, string[]>;
  locationFilter?: UrlFilter[];
} => {
  const selectedLocation = useSelectedLocation();

  const monitorQueryId = useMonitorQueryId();

  return useMemo(() => {
    if (!monitorQueryId || !selectedLocation) {
      return {};
    }
    return {
      queryIdFilter: {
        'monitor.id': [monitorQueryId],
      },
      locationFilter: [
        {
          field: 'observer.geo.name',
          // in 8.6.0, observer.geo.name was mapped to the id,
          // so we have to pass both values to maintain history
          values: [selectedLocation.label, selectedLocation.id],
        },
      ],
    };
  }, [monitorQueryId, selectedLocation]);
};
