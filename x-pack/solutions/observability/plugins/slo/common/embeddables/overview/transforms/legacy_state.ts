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

/**
 * Converts legacy (camelCase) stored state to current (snake_case) overview state.
 * Used in transformOut when reading panels from storage.
 */
export const legacyStoredStateToOverviewState = (
  storedState: OverviewEmbeddableState
): OverviewEmbeddableState => {
  const state = storedState as StoredStateWithLegacy & Record<string, unknown>;

  // Determine the overviewMode - check both new (snake_case) and legacy (camelCase) formats
  const overviewMode = state.overview_mode ?? state.overviewMode;

  // Check if this is legacy format (has camelCase fields)
  const hasLegacyFields = 'sloId' in state || 'groupFilters' in state || 'overviewMode' in state;

  if (overviewMode === 'single' || (!overviewMode && 'sloId' in state)) {
    // Single overview mode - prioritize new format, fallback to legacy
    if (hasLegacyFields && 'sloId' in state) {
      // Convert legacy camelCase to snake_case, preserving other fields
      const legacyFields = [
        'sloId',
        'sloInstanceId',
        'remoteName',
        'overviewMode',
        'showAllGroupByInstances',
      ];
      const rest = Object.fromEntries(
        Object.entries(state).filter(([key]) => !legacyFields.includes(key))
      );
      return {
        ...rest,
        slo_id: state.slo_id ?? (state.sloId as string | undefined),
        slo_instance_id: state.slo_instance_id ?? (state.sloInstanceId as string | undefined),
        remote_name: state.remote_name ?? (state.remoteName as string | undefined),
        overview_mode: 'single',
        show_all_group_by_instances:
          state.show_all_group_by_instances ??
          (state.showAllGroupByInstances as boolean | undefined),
      } as OverviewEmbeddableState;
    }

    // Already in new format - return as is
    return storedState;
  } else {
    // Group overview mode - prioritize new format, fallback to legacy
    if (hasLegacyFields && 'groupFilters' in state) {
      // Convert legacy camelCase to snake_case, preserving other fields
      const legacyFields = ['groupFilters', 'overviewMode'];
      const rest = Object.fromEntries(
        Object.entries(state).filter(([key]) => !legacyFields.includes(key))
      );
      const legacyGroupFilters = state.groupFilters as
        | {
            groupBy?: string;
            groups?: string[];
            filters?: unknown[];
            kqlQuery?: string;
            kql_query?: string;
          }
        | undefined;

      return {
        ...rest,
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
      } as OverviewEmbeddableState;
    }

    // Already in new format - return as is
    return storedState;
  }
};
