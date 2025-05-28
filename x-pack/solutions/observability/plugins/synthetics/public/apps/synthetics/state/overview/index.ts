/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReducer } from '@reduxjs/toolkit';
import { MonitorOverviewState, overviewViews } from './models';

import {
  setFlyoutConfig,
  setOverviewGroupByAction,
  setOverviewPageStateAction,
  setOverviewViewAction,
  toggleErrorPopoverOpen,
  trendStatsBatch,
} from './actions';

export const DEFAULT_OVERVIEW_VIEW = overviewViews[0];

const initialState: MonitorOverviewState = {
  pageState: {
    perPage: 16,
    sortOrder: 'asc',
    sortField: 'status',
  },
  trendStats: {},
  groupBy: { field: 'none', order: 'asc' },
  flyoutConfig: null,
  isErrorPopoverOpen: null,
  view: DEFAULT_OVERVIEW_VIEW,
};

export const monitorOverviewReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(setOverviewPageStateAction, (state, action) => {
      state.pageState = {
        ...state.pageState,
        ...action.payload,
      };
    })
    .addCase(setOverviewGroupByAction, (state, action) => {
      state.groupBy = {
        ...state.groupBy,
        ...action.payload,
      };
    })
    .addCase(setFlyoutConfig, (state, action) => {
      state.flyoutConfig = action.payload;
    })

    .addCase(toggleErrorPopoverOpen, (state, action) => {
      state.isErrorPopoverOpen = action.payload;
    })
    .addCase(trendStatsBatch.get, (state, action) => {
      for (const { configId, locationId } of action.payload) {
        if (!state.trendStats[configId + locationId]) {
          state.trendStats[configId + locationId] = 'loading';
        }
      }
    })
    .addCase(trendStatsBatch.fail, (state, action) => {
      for (const { configId, locationId } of action.payload) {
        if (state.trendStats[configId + locationId] === 'loading') {
          state.trendStats[configId + locationId] = null;
        }
      }
    })
    .addCase(trendStatsBatch.success, (state, action) => {
      for (const key of Object.keys(action.payload.trendStats)) {
        state.trendStats[key] = action.payload.trendStats[key];
      }
      for (const { configId, locationId } of action.payload.batch) {
        if (!action.payload.trendStats[configId + locationId]) {
          state.trendStats[configId + locationId] = null;
        }
      }
    })
    .addCase(setOverviewViewAction, (state, action) => {
      state.view = action.payload;
    });
});

export * from './models';
export * from './actions';
export * from './selectors';
