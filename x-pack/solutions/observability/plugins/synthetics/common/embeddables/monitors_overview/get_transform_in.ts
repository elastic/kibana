/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Reference } from '@kbn/content-management-utils';
import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
import type {
  OverviewMonitorsEmbeddableState,
  OverviewMonitorsEmbeddableStateSnakeCase,
} from './types';

export function getTransformIn(transformDrilldownsIn: DrilldownTransforms['transformIn']) {
  function transformIn(state: OverviewMonitorsEmbeddableState): {
    state: OverviewMonitorsEmbeddableState;
    references: Reference[];
  } {
    // Convert camelCase keys to snake_case for REST API compatibility
    if (state.filters) {
      const { monitorIds, monitorTypes, ...restFilters } = state.filters;
      const stateWithSnakeCaseKeys: OverviewMonitorsEmbeddableStateSnakeCase = {
        ...state,
        filters: {
          ...restFilters,
          monitor_ids: monitorIds,
          monitor_types: monitorTypes,
        },
      };
      return transformDrilldownsIn(stateWithSnakeCaseKeys) as {
        state: OverviewMonitorsEmbeddableState;
        references: Reference[];
      };
    }

    return transformDrilldownsIn(state);
  }
  return transformIn;
}
