/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OverviewEmbeddableState } from '../schema';

interface LegacyStoredOverviewEmbeddableState {
  sloId?: string;
  sloInstanceId?: string;
  remoteName?: string;
  overviewMode?: string;
  groupFilters?: string[];
  showAllGroupByInstances?: boolean;
}

export const getTransforms = () => ({
  transformOut: (storedState: OverviewEmbeddableState) => {
    const { sloId, sloInstanceId, remoteName, overviewMode, groupFilters, showAllGroupByInstances, ...state } = storedState as OverviewEmbeddableState & LegacyStoredOverviewEmbeddableState;
    const hasLegacyFields = sloId || groupFilters; 
    if (hasLegacyFields) {
      return {
        ...(state as OverviewEmbeddableState),
        slo_id: sloId,
        slo_instance_id: sloInstanceId,
        remote_name: remoteName,
        overview_mode: overviewMode,
        group_filters: groupFilters,
        show_all_group_by_instances: showAllGroupByInstances,
      }
    }

    return storedState;
  },
});

