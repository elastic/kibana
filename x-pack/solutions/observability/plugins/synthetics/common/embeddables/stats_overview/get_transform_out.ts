/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Reference } from '@kbn/content-management-utils/src/types';
import { transformTitlesOut } from '@kbn/presentation-publishing';
import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
import { flow } from 'lodash';
import type { OverviewStatsEmbeddableState } from './types';
import type { LegacyMonitorFilters } from '../../types';

export function getTransformOut(transformDrilldownsOut: DrilldownTransforms['transformOut']) {
  function transformOut(storedState: OverviewStatsEmbeddableState, references?: Reference[]) {
    const transformsFlow = flow(
      transformTitlesOut<OverviewStatsEmbeddableState>,
      (state: OverviewStatsEmbeddableState) => {
        // Handle legacy stored shape: convert camelCase to snake_case (REST API shape)
        if (state.filters) {
          const filters = state.filters as unknown as LegacyMonitorFilters;
          const hasLegacyKeys = 'monitorIds' in filters || 'monitorTypes' in filters;

          if (hasLegacyKeys) {
            // Convert legacy camelCase to REST API snake_case
            const convertedState: OverviewStatsEmbeddableState = {
              ...state,
              filters: {
                projects: filters.projects,
                tags: filters.tags,
                locations: filters.locations,
                monitor_ids: filters.monitorIds || filters.monitor_ids || [],
                monitor_types: filters.monitorTypes || filters.monitor_types || [],
              },
            };
            return transformDrilldownsOut(convertedState, references);
          }
        }
        // Already in REST API shape (snake_case)
        return transformDrilldownsOut(state, references);
      }
    );
    return transformsFlow(storedState);
  }
  return transformOut;
}
