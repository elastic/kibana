/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReducer } from '@reduxjs/toolkit';
import type { FindMaintenanceWindowsResult } from '@kbn/maintenance-windows-plugin/common';
import { getMaintenanceWindowsAction } from './actions';

export interface MaintenanceWindowsState {
  isLoading?: boolean;
  data?: FindMaintenanceWindowsResult;
}

const initialState: MaintenanceWindowsState = {
  isLoading: false,
};

export const maintenanceWindowsReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(getMaintenanceWindowsAction.get, (state) => {
      state.isLoading = true;
    })
    .addCase(getMaintenanceWindowsAction.success, (state, action) => {
      state.isLoading = false;
      state.data = action.payload;
    })
    .addCase(getMaintenanceWindowsAction.fail, (state, action) => {
      state.isLoading = false;
    });
});

export * from './actions';
export * from './effects';
export * from './selectors';
export * from './api';
