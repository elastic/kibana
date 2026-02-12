/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Reference } from '@kbn/content-management-utils';
import type { OverviewMonitorsEmbeddableState } from './types';
import type { LegacyMonitorFilters } from '../../types';

export function getTransformIn() {
  function transformIn(
    storedState: OverviewMonitorsEmbeddableState,
    references?: Reference[]
  ): { state: OverviewMonitorsEmbeddableState; references: Reference[] } {
    // Handle legacy stored shape: convert camelCase to snake_case (REST API shape)
    if (storedState.filters) {
      const filters = storedState.filters as unknown as LegacyMonitorFilters;
      const hasLegacyKeys = 'monitorIds' in filters || 'monitorTypes' in filters;

      if (hasLegacyKeys) {
        // Convert legacy camelCase to REST API snake_case
        return {
          state: {
            ...storedState,
            filters: {
              projects: filters.projects,
              tags: filters.tags,
              locations: filters.locations,
              monitor_ids: filters.monitorIds || filters.monitor_ids,
              monitor_types: filters.monitorTypes || filters.monitor_types,
            },
          },
          references: references ?? [],
        };
      }
    }
    // Already in REST API shape (snake_case)
    return { state: storedState, references: references ?? [] };
  }
  return transformIn;
}
