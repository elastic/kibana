/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_VALUE } from '@kbn/slo-schema';
import type {
  OverviewEmbeddableState,
  SingleOverviewCustomState,
} from '../../../../server/lib/embeddables/schema';

export interface LegacySingleOverviewState {
  sloId: string;
  sloInstanceId?: string;
  remoteName?: string;
  overviewMode: 'single';
  showAllGroupByInstances?: boolean;
}

/**
 * Converts pre 9.4 single overview camelCase state to snake_case state.
 */
export function transformSingleOverviewOut(
  storedState: OverviewEmbeddableState
): OverviewEmbeddableState {
  const {
    sloId: legacySloId,
    sloInstanceId: legacySloInstanceId,
    remoteName: legacyRemoteName,
    overviewMode: legacyOverviewMode,
    showAllGroupByInstances: legacyShowAll,
    ...state
  } = storedState as SingleOverviewCustomState & LegacySingleOverviewState;

  const sloId = state.slo_id ?? legacySloId;
  const sloInstanceId = state.slo_instance_id ?? legacySloInstanceId;
  const remoteName = state.remote_name ?? legacyRemoteName;
  const overviewMode = state.overview_mode ?? legacyOverviewMode;

  // Legacy non-grouped SLOs stored sloInstanceId: "*" with showAllGroupByInstances: false.
  // Drop slo_instance_id in that case to avoid rendering all-instances view for a non-grouped SLO.
  const shouldIncludeInstanceId =
    sloInstanceId && (sloInstanceId !== ALL_VALUE || legacyShowAll === true);

  return {
    ...state,
    ...(sloId ? { slo_id: sloId } : {}),
    ...(shouldIncludeInstanceId ? { slo_instance_id: sloInstanceId } : {}),
    ...(remoteName ? { remote_name: remoteName } : {}),
    ...(overviewMode ? { overview_mode: overviewMode } : {}),
  };
}
