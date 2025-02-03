/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReducer } from '@reduxjs/toolkit';
import { AgentPolicyInfo } from '../../../../../common/types';
import { IHttpSerializedFetchError } from '..';
import { getAgentPoliciesAction } from './actions';

export interface AgentPoliciesState {
  data: AgentPolicyInfo[] | null;
  loading: boolean;
  error: IHttpSerializedFetchError | null;
}

const initialState: AgentPoliciesState = {
  data: null,
  loading: false,
  error: null,
};

export const agentPoliciesReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(getAgentPoliciesAction.get, (state) => {
      state.loading = true;
    })
    .addCase(getAgentPoliciesAction.success, (state, action) => {
      state.data = action.payload;
      state.loading = false;
    })
    .addCase(getAgentPoliciesAction.fail, (state, action) => {
      state.error = action.payload;
      state.loading = false;
    });
});

export * from './actions';
export * from './effects';
export * from './selectors';
