/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';

import { EncryptedSyntheticsSavedMonitor } from '../../../../../common/runtime_types';
import { SyntheticsAppState } from '../root_reducer';
import { MonitorFilterState } from './models';

export const selectMonitorListState = (state: SyntheticsAppState) => state.monitorList;
export const selectEncryptedSyntheticsSavedMonitors = createSelector(
  selectMonitorListState,
  (state) =>
    state?.data.monitors.map((monitor) => ({
      ...monitor,
      updated_at: monitor.updated_at,
      created_at: monitor.created_at,
    })) as EncryptedSyntheticsSavedMonitor[]
);

export const selectMonitorFiltersAndQueryState = createSelector(selectMonitorListState, (state) => {
  const { monitorTypes, tags, locations, projects, schedules }: MonitorFilterState =
    state.pageState;
  const { query } = state.pageState;

  return { monitorTypes, tags, locations, projects, schedules, query };
});

export const selectMonitorUpsertStatuses = (state: SyntheticsAppState) =>
  state.monitorList.monitorUpsertStatuses;

export const selectMonitorUpsertStatus = (configId: string) => (state: SyntheticsAppState) =>
  state.monitorList.monitorUpsertStatuses?.[configId] ?? null;

export const selectMonitorFilterOptions = createSelector(
  selectMonitorListState,
  (state) => state.monitorFilterOptions
);
