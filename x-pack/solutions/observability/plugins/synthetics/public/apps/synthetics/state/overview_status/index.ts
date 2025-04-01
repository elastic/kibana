/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReducer } from '@reduxjs/toolkit';

import { OverviewStatusMetaData, OverviewStatusState } from '../../../../../common/runtime_types';
import { IHttpSerializedFetchError } from '..';
import {
  clearOverviewStatusErrorAction,
  clearOverviewStatusState,
  fetchOverviewStatusAction,
  quietFetchOverviewStatusAction,
} from './actions';

export interface OverviewStatusStateReducer {
  loading: boolean;
  loaded: boolean;
  status: OverviewStatusState | null;
  allConfigs?: OverviewStatusMetaData[];
  disabledConfigs?: OverviewStatusMetaData[];
  error: IHttpSerializedFetchError | null;
}

const initialState: OverviewStatusStateReducer = {
  loading: false,
  loaded: false,
  status: null,
  error: null,
};

export const overviewStatusReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(fetchOverviewStatusAction.get, (state) => {
      state.status = null;
      state.loading = true;
    })
    .addCase(quietFetchOverviewStatusAction.get, (state) => {
      state.loading = true;
    })
    .addCase(fetchOverviewStatusAction.success, (state, action) => {
      state.status = action.payload;
      state.allConfigs = Object.values({
        ...action.payload.upConfigs,
        ...action.payload.downConfigs,
        ...action.payload.pendingConfigs,
        ...action.payload.disabledConfigs,
      });
      state.disabledConfigs = state.allConfigs.filter((monitor) => !monitor.isEnabled);
      state.loaded = true;
      state.loading = false;
    })
    .addCase(fetchOverviewStatusAction.fail, (state, action) => {
      state.error = action.payload;
      state.loading = false;
    })
    .addCase(clearOverviewStatusState, (state, action) => {
      state.status = null;
      state.loading = false;
      state.loaded = false;
      state.error = null;
    })
    .addCase(clearOverviewStatusErrorAction, (state) => {
      state.error = null;
    });
});

export * from './actions';
export * from './effects';
export * from './selectors';
