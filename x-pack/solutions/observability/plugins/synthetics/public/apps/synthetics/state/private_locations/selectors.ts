/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';
import { AppState } from '..';

const getState = (appState: AppState) => appState.privateLocations;
export const selectAgentPolicies = createSelector(getState, (state) => state);

export const selectAddingNewPrivateLocation = (state: AppState) =>
  state.privateLocations.isCreatePrivateLocationFlyoutVisible ?? false;

export const selectPrivateLocationsLoading = (state: AppState) =>
  state.privateLocations.loading ?? false;

export const selectPrivateLocationCreating = (state: AppState) =>
  state.privateLocations.createLoading ?? false;

export const selectPrivateLocationDeleting = (state: AppState) =>
  state.privateLocations.deleteLoading ?? false;

export const selectPrivateLocationsState = (state: AppState) => state.privateLocations;

export const selectPrivateLocations = (state: AppState) => state.privateLocations.data ?? [];
