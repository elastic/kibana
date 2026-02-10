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

// Legacy stored shape with camelCase keys (backward compatibility)
interface LegacyFilters {
  projects: Array<{ label: string; value: string }>;
  tags: Array<{ label: string; value: string }>;
  locations: Array<{ label: string; value: string }>;
  monitorIds?: Array<{ label: string; value: string }>;
  monitorTypes?: Array<{ label: string; value: string }>;
  monitor_ids?: Array<{ label: string; value: string }>;
  monitor_types?: Array<{ label: string; value: string }>;
}

export function getTransformOut(transformDrilldownsOut: DrilldownTransforms['transformOut']) {
  function transformOut(storedState: OverviewStatsEmbeddableState, references?: Reference[]) {
    const transformsFlow = flow(
      transformTitlesOut<OverviewStatsEmbeddableState>,
      (state: OverviewStatsEmbeddableState) => {
        // Handle legacy stored shape: convert camelCase to snake_case (REST API shape)
        if (state.filters) {
          const filters = state.filters as unknown as LegacyFilters;
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
