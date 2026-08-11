/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromStoredFilters } from '@kbn/as-code-filters-transforms';
import type { Filter } from '@kbn/es-query';
import type {
  GroupOverviewCustomState,
  OverviewEmbeddableState,
} from '../../../../server/lib/embeddables/schema';

export interface LegacyGroupOverviewState {
  overviewMode: 'groups';
  groupFilters: {
    groupBy: 'slo.tags' | 'status' | 'slo.indicator.type';
    groups?: string[];
    filters?: Filter[];
    kqlQuery?: string;
  };
}

/**
 * Converts pre 9.4 group overview camelCase state to snake_case state.
 */
export function transformGroupOverviewOut(
  storedState: OverviewEmbeddableState
): OverviewEmbeddableState {
  const {
    groupFilters: legacyGroupFilters,
    overviewMode: legacyOverviewMode,
    ...state
  } = storedState as GroupOverviewCustomState & LegacyGroupOverviewState;

  const groupFilters = state.group_filters ?? transformGroupFilters(legacyGroupFilters ?? {});
  const overviewMode = state.overview_mode ?? legacyOverviewMode;
  return {
    ...state,
    ...(groupFilters ? { group_filters: groupFilters } : {}),
    ...(overviewMode ? { overview_mode: overviewMode } : {}),
  };
}

function transformGroupFilters(
  groupFilters: LegacyGroupOverviewState['groupFilters']
): GroupOverviewCustomState['group_filters'] {
  const { groupBy, filters, kqlQuery, ...state } = groupFilters;

  return {
    ...state,
    group_by: groupBy ?? 'status',
    ...(filters ? { filters: fromStoredFilters(groupFilters.filters) } : {}),
    ...(kqlQuery ? { kql_query: kqlQuery } : {}),
  };
}
