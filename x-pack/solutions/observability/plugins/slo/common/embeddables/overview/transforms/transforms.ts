/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  LegacySingleOverviewEmbeddableState,
  LegacyGroupOverviewEmbeddableState,
} from '../schema';
import type { OverviewEmbeddableState } from '../../../../server/lib/embeddables/schema';
import type { SingleOverviewCustomState, GroupOverviewCustomState } from '../schema';

type StoredStateWithLegacy = Partial<SingleOverviewCustomState> &
  Partial<GroupOverviewCustomState> &
  Partial<LegacySingleOverviewEmbeddableState> &
  Partial<LegacyGroupOverviewEmbeddableState>;

export const getTransforms = () => ({
  transformOut: (storedState: OverviewEmbeddableState) => {
    const state = storedState as StoredStateWithLegacy;

    // Determine the overviewMode - check both new (snake_case) and legacy (camelCase) formats
    const overviewMode = state.overview_mode ?? state.overviewMode;

    if (overviewMode === 'single' || (!overviewMode && 'sloId' in state)) {
      // Single overview mode - prioritize new format, fallback to legacy
      return {
        slo_id: state.slo_id ?? state.sloId,
        slo_instance_id: state.slo_instance_id ?? state.sloInstanceId,
        remote_name: state.remote_name ?? state.remoteName,
        overview_mode: 'single',
        show_all_group_by_instances:
          state.show_all_group_by_instances ?? state.showAllGroupByInstances,
      };
    } else {
      // Group overview mode - prioritize new format, fallback to legacy
      const legacyGroupFilters = state.groupFilters;

      return {
        overview_mode: 'groups',
        group_filters: state.group_filters
          ? state.group_filters
          : legacyGroupFilters
          ? {
              group_by: legacyGroupFilters.groupBy,
              groups: legacyGroupFilters.groups,
              filters: legacyGroupFilters.filters,
              kql_query: legacyGroupFilters.kqlQuery,
            }
          : undefined,
      };
    }
  },
});
