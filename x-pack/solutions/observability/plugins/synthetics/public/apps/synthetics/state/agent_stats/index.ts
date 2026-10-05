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
import {
  createPrivateLocationAction,
  deletePrivateLocationAction,
  editPrivateLocationAction,
} from '../private_locations/actions';

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

const invalidateAgentStatsCache = (state: AgentStatsState) => {
  state.data = null;
  state.loading = true;
  state.error = null;
};

export const agentStatsReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(getAgentStatsAction.get, (state) => {
      state.loading = true;
      state.error = null;
    })
    .addCase(getAgentStatsAction.success, (state, action) => {
      state.data = action.payload;
      state.loading = false;
      state.error = null;
    })
    .addCase(getAgentStatsAction.fail, (state, action) => {
      state.error = action.payload;
      state.loading = false;
    })
    // Locations list is nulled on create/edit/delete; drop this cache too so
    // useAgentStats refetches instead of showing "No agents" for a new row.
    .addCase(createPrivateLocationAction.success, invalidateAgentStatsCache)
    .addCase(editPrivateLocationAction.success, invalidateAgentStatsCache)
    .addCase(deletePrivateLocationAction.success, invalidateAgentStatsCache);
});

export * from './actions';
export * from './effects';
export * from './selectors';
