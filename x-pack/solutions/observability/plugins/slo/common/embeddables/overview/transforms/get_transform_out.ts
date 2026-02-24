/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Reference } from '@kbn/content-management-utils';
import { fromStoredFilters } from '@kbn/as-code-filters-transforms';
import { transformTitlesOut } from '@kbn/presentation-publishing';
import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
import { flow } from 'lodash';
import type { OverviewEmbeddableState } from '../../../../server/lib/embeddables/schema';
import { legacyStoredStateToOverviewState } from './legacy_state';

/**
 * Detects if filters are in stored (es-query) format rather than as-code format.
 * Stored filters have meta and query; as-code have condition, group, or dsl.
 */
function isStoredFilterFormat(filters: unknown): filters is unknown[] {
  return (
    Array.isArray(filters) &&
    filters.length > 0 &&
    typeof filters[0] === 'object' &&
    filters[0] !== null &&
    'meta' in (filters[0] as object) &&
    'query' in (filters[0] as object)
  );
}

/**
 * Converts group_filters.filters from stored format to as-code when reading from storage.
 * Dashboards saved before the as-code migration may have stored filters.
 */
function convertStoredFiltersToAsCode(state: OverviewEmbeddableState): OverviewEmbeddableState {
  const groupFilters = (state as Record<string, unknown>).group_filters as
    | { filters?: unknown[]; group_by?: string; groups?: string[]; kql_query?: string }
    | undefined;
  if (!groupFilters?.filters || !isStoredFilterFormat(groupFilters.filters)) {
    return state;
  }
  const asCodeFilters = fromStoredFilters(groupFilters.filters);
  return {
    ...state,
    group_filters: {
      ...groupFilters,
      filters: asCodeFilters ?? [],
    },
  } as OverviewEmbeddableState;
}

export const getTransformOut = (transformDrilldownsOut: DrilldownTransforms['transformOut']) => {
  const transformOut = (storedState: OverviewEmbeddableState, panelReferences?: Reference[]) => {
    const transformsFlow = flow(
      legacyStoredStateToOverviewState,
      convertStoredFiltersToAsCode,
      transformTitlesOut<OverviewEmbeddableState>,
      (state: OverviewEmbeddableState) =>
        transformDrilldownsOut(
          state as OverviewEmbeddableState & {
            drilldowns?: Array<{ label: string; trigger: string; type: string }>;
          },
          panelReferences
        )
    );
    return transformsFlow(storedState);
  };
  return transformOut;
};
