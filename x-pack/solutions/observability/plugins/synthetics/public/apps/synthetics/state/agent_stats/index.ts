/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReducer } from 'redux-toolkit-v1';
import type { LocationAgentStats } from '../../../../../common/types';
import type { IHttpSerializedFetchError } from '..';
import { getAgentStatsAction } from './actions';

export interface AgentStatsState {
  data: LocationAgentStats[] | null;
  loading: boolean;
  error: IHttpSerializedFetchError | null;
}

const initialState: AgentStatsState = {
  data: null,
  loading: false,
  error: null,
};

export const agentStatsReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(getAgentStatsAction.get, (state) => {
      state.loading = true;
    })
    .addCase(getAgentStatsAction.success, (state, action) => {
      state.data = action.payload;
      state.loading = false;
    })
    .addCase(getAgentStatsAction.fail, (state, action) => {
      state.error = action.payload;
      state.loading = false;
    });
});

export * from './actions';
export * from './effects';
export * from './selectors';
