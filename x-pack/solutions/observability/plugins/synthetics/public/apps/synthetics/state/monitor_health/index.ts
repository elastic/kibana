/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReducer } from '@reduxjs/toolkit';
import type { IHttpSerializedFetchError } from '..';
import type { MonitorsHealthResponse } from './models';
import { fetchMonitorHealthAction } from './actions';

export interface MonitorHealthState {
  data: MonitorsHealthResponse | null;
  loading: boolean;
  loaded: boolean;
  error: IHttpSerializedFetchError | null;
}

const initialState: MonitorHealthState = {
  data: null,
  loading: false,
  loaded: false,
  error: null,
};

export const monitorHealthReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(fetchMonitorHealthAction.get, (state) => {
      state.loading = true;
      state.loaded = false;
      state.error = null;
    })
    .addCase(fetchMonitorHealthAction.success, (state, action) => {
      state.data = action.payload;
      state.loading = false;
      state.loaded = true;
      state.error = null;
    })
    .addCase(fetchMonitorHealthAction.fail, (state, action) => {
      state.loading = false;
      state.error = action.payload;
    });
});

export * from './actions';
export * from './effects';
export * from './selectors';
export type * from './models';
