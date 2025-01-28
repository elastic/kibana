/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';
import { SyntheticsAppState } from '../root_reducer';
import { AppState } from '..';

export const selectDynamicSettings = (state: SyntheticsAppState) => state.dynamicSettings;
const getState = (appState: AppState) => appState.agentPolicies;
export const selectAgentPolicies = createSelector(getState, (state) => state);

export const selectAddingNewPrivateLocation = (state: AppState) =>
  state.privateLocations.isCreatePrivateLocationFlyoutVisible ?? false;

export const selectLocationMonitors = (state: AppState) => ({
  locationMonitors: state.dynamicSettings.locationMonitors,
  loading: state.dynamicSettings.locationMonitorsLoading,
});
