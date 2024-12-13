/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReducer } from '@reduxjs/toolkit';
import { DynamicSettings } from '../../../../../common/runtime_types';
import { IHttpSerializedFetchError } from '..';
import {
  getConnectorsAction,
  getDynamicSettingsAction,
  getLocationMonitorsAction,
  setDynamicSettingsAction,
} from './actions';
import { ActionConnector } from './api';
import { syncGlobalParamsAction } from './actions';

export interface LocationMonitor {
  id: string;
  count: number;
}

export interface DynamicSettingsState {
  settings?: DynamicSettings;
  loadError?: IHttpSerializedFetchError;
  saveError?: IHttpSerializedFetchError;
  loading: boolean;
  connectors?: ActionConnector[];
  connectorsLoading?: boolean;
  locationMonitors: LocationMonitor[];
  locationMonitorsLoading?: boolean;
}

const initialState: DynamicSettingsState = {
  loading: true,
  connectors: [],
  locationMonitors: [],
};

export const dynamicSettingsReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(getDynamicSettingsAction.get, (state) => {
      state.loading = true;
    })
    .addCase(getDynamicSettingsAction.success, (state, action) => {
      state.settings = action.payload;
      state.loading = false;
    })
    .addCase(getDynamicSettingsAction.fail, (state, action) => {
      state.loadError = action.payload;
      state.loading = false;
    })
    .addCase(setDynamicSettingsAction.get, (state) => {
      state.loading = true;
    })
    .addCase(setDynamicSettingsAction.success, (state, action) => {
      state.settings = action.payload;
      state.loading = false;
    })
    .addCase(setDynamicSettingsAction.fail, (state, action) => {
      state.loadError = action.payload;
      state.loading = false;
    })
    .addCase(getConnectorsAction.get, (state) => {
      state.connectorsLoading = true;
    })
    .addCase(getConnectorsAction.success, (state, action) => {
      state.connectors = action.payload;
      state.connectorsLoading = false;
    })
    .addCase(getConnectorsAction.fail, (state, _action) => {
      state.connectorsLoading = false;
    })
    .addCase(getLocationMonitorsAction.get, (state) => {
      state.locationMonitorsLoading = true;
    })
    .addCase(getLocationMonitorsAction.success, (state, action) => {
      state.locationMonitors = action.payload;
      state.locationMonitorsLoading = false;
    })
    .addCase(getLocationMonitorsAction.fail, (state) => {
      state.locationMonitorsLoading = false;
    });
});

export interface SettingsState {
  success: boolean | null;
  loading: boolean;
  error: IHttpSerializedFetchError | null;
}

const initialSettingState: SettingsState = {
  success: null,
  loading: false,
  error: null,
};

export const settingsReducer = createReducer(initialSettingState, (builder) => {
  builder
    .addCase(syncGlobalParamsAction.get, (state) => {
      state.loading = true;
    })
    .addCase(syncGlobalParamsAction.success, (state, action) => {
      state.success = action.payload;
      state.loading = false;
    })
    .addCase(syncGlobalParamsAction.fail, (state, action) => {
      state.error = action.payload;
      state.loading = false;
      state.success = false;
    });
});

export * from './actions';
export * from './effects';
export * from './selectors';
