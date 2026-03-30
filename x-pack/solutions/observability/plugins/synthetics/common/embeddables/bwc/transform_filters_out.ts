/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MonitorFilters, MonitorOption } from '../../types';

interface LegacyStoredFilters {
  monitorIds?: MonitorOption[];
  monitorTypes?: MonitorOption[];
}

/**
 * Pre 9.4 the monitor_ids and monitor_types state was stored in a camelCased key called monitorIds and monitorTypes.
 * This transform out function ensures that this state is not dropped when loading from
 * a legacy stored state.
 */
export function transformFiltersOut<StateType extends { filters?: MonitorFilters }>(
  storedState: StateType
) {
  if (!storedState.filters) {
    return storedState;
  }

  const {
    monitorIds: legacyMonitorIds,
    monitorTypes: legacyMonitorTypes,
    ...restOfFilters
  } = storedState.filters as MonitorFilters & LegacyStoredFilters;
  const monitorIds = storedState.filters.monitor_ids ?? legacyMonitorIds;
  const monitorTypes = storedState.filters.monitor_types ?? legacyMonitorTypes;
  return {
    ...storedState,
    filters: {
      ...restOfFilters,
      ...(monitorIds ? { monitor_ids: monitorIds } : {}),
      ...(monitorTypes ? { monitor_types: monitorTypes } : {}),
    },
  };
}
