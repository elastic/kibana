/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReducer } from '@reduxjs/toolkit';
import { StatusRuleInspect } from '../../../../../common/runtime_types/alert_rules/common';
import { DEFAULT_ALERT_RESPONSE } from '../../../../../common/types/default_alerts';
import { IHttpSerializedFetchError } from '..';
import {
  enableDefaultAlertingAction,
  enableDefaultAlertingSilentlyAction,
  getDefaultAlertingAction,
  inspectStatusRuleAction,
  updateDefaultAlertingAction,
} from './actions';

export interface DefaultAlertingState {
  inspectData?: StatusRuleInspect;
  data?: DEFAULT_ALERT_RESPONSE;
  success: boolean | null;
  loading: boolean;
  error: IHttpSerializedFetchError | null;
  inspectLoading: boolean;
  inspectError?: IHttpSerializedFetchError | null;
}

const initialSettingState: DefaultAlertingState = {
  success: null,
  loading: false,
  error: null,
  inspectData: undefined,
  inspectLoading: false,
  inspectError: null,
};

export const defaultAlertingReducer = createReducer(initialSettingState, (builder) => {
  builder
    .addCase(getDefaultAlertingAction.get, (state) => {
      state.loading = true;
    })
    .addCase(enableDefaultAlertingSilentlyAction.get, (state) => {
      state.loading = true;
    })
    .addCase(enableDefaultAlertingAction.get, (state) => {
      state.loading = true;
    })
    .addCase(enableDefaultAlertingAction.success, (state, action) => {
      state.data = action.payload;
      state.success = Boolean(action.payload);
      state.loading = false;
    })
    .addCase(enableDefaultAlertingAction.fail, (state, action) => {
      state.error = action.payload;
      state.loading = false;
      state.success = false;
    })
    .addCase(updateDefaultAlertingAction.get, (state) => {
      state.loading = true;
    })
    .addCase(updateDefaultAlertingAction.success, (state, action) => {
      state.success = Boolean(action.payload);
      state.loading = false;
    })
    .addCase(updateDefaultAlertingAction.fail, (state, action) => {
      state.error = action.payload;
      state.loading = false;
      state.success = false;
    })
    .addCase(inspectStatusRuleAction.get, (state) => {
      state.inspectLoading = true;
    })
    .addCase(inspectStatusRuleAction.success, (state, action) => {
      state.inspectData = action.payload;
      state.inspectLoading = false;
      state.inspectError = null;
    })
    .addCase(inspectStatusRuleAction.fail, (state, action) => {
      state.inspectError = action.payload;
      state.inspectLoading = false;
    });
});

export * from './actions';
export * from './effects';
