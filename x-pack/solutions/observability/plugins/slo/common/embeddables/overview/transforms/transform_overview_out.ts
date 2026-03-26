/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OverviewEmbeddableState } from '../../../../server/lib/embeddables/schema';
import type { LegacyGroupOverviewState } from './transform_group_overview_out';
import { transformGroupOverviewOut } from './transform_group_overview_out';
import type { LegacySingleOverviewState } from './transform_single_overview_out';
import { transformSingleOverviewOut } from './transform_single_overview_out';

export function transformOverviewOut(
  storedState: OverviewEmbeddableState
): OverviewEmbeddableState {
  const overviewMode =
    storedState.overview_mode ??
    (storedState as LegacySingleOverviewState | LegacyGroupOverviewState).overviewMode;
  if (overviewMode === 'single') {
    const state = transformSingleOverviewOut(storedState);
    // bug in pre 9.4 embeddable that serialized both 'single' and 'groups' into embeddable state
    // remove 'groups' state to avoid schema validation errors
    const { groupFilters, ...rest } = state as OverviewEmbeddableState & LegacyGroupOverviewState;
    return rest;
  }

  if (overviewMode === 'groups') {
    const state = transformGroupOverviewOut(storedState);
    // bug in pre 9.4 embeddable that serialized both 'single' and 'groups' into embeddable state
    // remove 'single' state to avoid schema validation errors
    const { sloId, sloInstanceId, remoteName, showAllGroupByInstances, ...rest } =
      state as OverviewEmbeddableState & LegacySingleOverviewState;
    return rest;
  }

  return storedState;
}
