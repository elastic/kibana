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
import type {
  OverviewMonitorsEmbeddableState,
  OverviewMonitorsEmbeddableStateSnakeCase,
} from './types';

export function getTransformOut(transformDrilldownsOut: DrilldownTransforms['transformOut']) {
  function transformOut(
    storedState: OverviewMonitorsEmbeddableStateSnakeCase,
    references?: Reference[]
  ) {
    const transformsFlow = flow(
      transformTitlesOut<OverviewMonitorsEmbeddableStateSnakeCase>,
      (state: OverviewMonitorsEmbeddableStateSnakeCase) => {
        // Convert snake_case keys back to camelCase for frontend
        if (state.filters) {
          const { monitor_ids, monitor_types, ...restFilters } = state.filters;
          const stateWithCamelCaseKeys: OverviewMonitorsEmbeddableState = {
            ...state,
            filters: {
              ...restFilters,
              monitorIds: monitor_ids,
              monitorTypes: monitor_types,
            },
          };
          return transformDrilldownsOut(stateWithCamelCaseKeys, references);
        }
        return transformDrilldownsOut(state, references);
      }
    );
    return transformsFlow(storedState);
  }
  return transformOut;
}
