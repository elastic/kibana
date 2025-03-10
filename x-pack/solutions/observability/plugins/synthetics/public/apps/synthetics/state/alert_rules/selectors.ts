/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';
import type { SyntheticsAppState } from '../root_reducer';

const getState = (appState: SyntheticsAppState) => appState.defaultAlerting;
export const selectSyntheticsAlerts = createSelector(getState, (state) => state.data);
export const selectSyntheticsAlertsLoading = createSelector(getState, (state) => state.loading);
export const selectSyntheticsAlertsLoaded = createSelector(getState, (state) => state.success);
export const selectInspectStatusRule = createSelector(getState, (state) => {
  return {
    loading: state.inspectLoading,
    data: state.inspectData,
    error: state.inspectError,
  };
});
