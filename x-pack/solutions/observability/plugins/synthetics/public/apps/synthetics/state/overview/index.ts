/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReducer } from 'redux-toolkit-v1';
import { CLIENT_DEFAULTS_SYNTHETICS } from '../../../../../common/constants/synthetics/client_defaults';
import { OVERVIEW_PAGINATION_DEFAULTS } from '../../../../../common/constants/monitor_management';
import type { MonitorOverviewState } from './models';
import { overviewViews } from './models';
import { isPageStateSlotEqual } from '../utils/page_state_equality';
import { getInitialShowFromAllSpaces } from '../utils/get_initial_show_from_all_spaces';
import { getInitialIncludeHeartbeatMonitors } from '../utils/get_initial_include_heartbeat_monitors';
import { getInitialShowLastRun } from '../utils/get_initial_show_last_run';

import {
  setFlyoutConfig,
  setOverviewGroupByAction,
  setOverviewPageStateAction,
  setOverviewShowLastRunAction,
  setOverviewViewAction,
  toggleErrorPopoverOpen,
  trendStatsBatch,
} from './actions';

export const DEFAULT_OVERVIEW_VIEW = overviewViews[0];
export const DEFAULT_OVERVIEW_PER_PAGE = OVERVIEW_PAGINATION_DEFAULTS.perPage;

const initialState: MonitorOverviewState = {
  pageState: {
    page: OVERVIEW_PAGINATION_DEFAULTS.page,
    perPage: DEFAULT_OVERVIEW_PER_PAGE,
    sortOrder: OVERVIEW_PAGINATION_DEFAULTS.sortOrder,
    sortField: OVERVIEW_PAGINATION_DEFAULTS.sortField,
    showFromAllSpaces: getInitialShowFromAllSpaces(),
    includeHeartbeatMonitors: getInitialIncludeHeartbeatMonitors(),
    // Seed the date-range window so the very first overview fetch is already
    // scoped to the picker's default; `useSyncOverviewDateRange` keeps it in
    // step with the URL afterwards. The overview uses its own (narrower) default
    // window rather than the app-wide one.
    dateRangeStart: CLIENT_DEFAULTS_SYNTHETICS.OVERVIEW_DATE_RANGE_START,
    dateRangeEnd: CLIENT_DEFAULTS_SYNTHETICS.DATE_RANGE_END,
  },
  trendStats: {},
  groupBy: { field: 'none', order: 'asc' },
  flyoutConfig: null,
  isErrorPopoverOpen: null,
  view: DEFAULT_OVERVIEW_VIEW,
  showLastRun: getInitialShowLastRun(),
};

export const monitorOverviewReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(setOverviewPageStateAction, (state, action) => {
      // Property-by-property with deep equality so no-op dispatches (e.g.
      // ShowAllSpaces re-sending the same value, or [] filter arrays from
      // mount effects) don't create a new pageState reference and re-trigger
      // the useDebounce fetch in useOverviewStatus.
      const paginationKeys = new Set(['page', 'perPage']);
      let hasNonPaginationChange = false;

      for (const key of Object.keys(action.payload) as Array<keyof typeof action.payload>) {
        const value = action.payload[key];
        if (!isPageStateSlotEqual((state.pageState as Record<string, unknown>)[key], value)) {
          (state.pageState as Record<string, unknown>)[key] = value;
          if (!paginationKeys.has(key)) {
            hasNonPaginationChange = true;
          }
        }
      }

      // Reset to first page when any non-pagination field changes (e.g.
      // filters, sort, query) unless the caller already set page explicitly.
      if (hasNonPaginationChange && !('page' in action.payload)) {
        state.pageState.page = 1;
      }
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
      for (const { configId, locationIds } of action.payload) {
        if (!state.trendStats[configId]) {
          state.trendStats[configId] = 'loading';
        }
        for (const locationId of locationIds) {
          const key = configId + locationId;
          if (!state.trendStats[key]) {
            state.trendStats[key] = 'loading';
          }
        }
      }
    })
    .addCase(trendStatsBatch.fail, (state, action) => {
      for (const { configId, locationIds } of action.payload) {
        if (state.trendStats[configId] === 'loading') {
          state.trendStats[configId] = null;
        }
        for (const locationId of locationIds) {
          const key = configId + locationId;
          if (state.trendStats[key] === 'loading') {
            state.trendStats[key] = null;
          }
        }
      }
    })
    .addCase(trendStatsBatch.success, (state, action) => {
      for (const key of Object.keys(action.payload.trendStats)) {
        state.trendStats[key] = action.payload.trendStats[key];
      }
      for (const { configId, locationIds } of action.payload.batch) {
        if (!action.payload.trendStats[configId]) {
          state.trendStats[configId] = null;
        }
        for (const locationId of locationIds) {
          const key = configId + locationId;
          if (!action.payload.trendStats[key]) {
            state.trendStats[key] = null;
          }
        }
      }
    })
    .addCase(setOverviewViewAction, (state, action) => {
      // Reset pagination on a real view switch so neither view inherits the
      // other's window. Always assign a new `pageState` object: card infinite
      // scroll never writes page/perPage, so Immer would keep the same
      // reference and `useOverviewStatus` would not refetch.
      if (state.view !== action.payload) {
        state.pageState = {
          ...state.pageState,
          page: 1,
          perPage: DEFAULT_OVERVIEW_PER_PAGE,
        };
      }
      state.view = action.payload;
    })
    .addCase(setOverviewShowLastRunAction, (state, action) => {
      state.showLastRun = action.payload;
    });
});

export * from './models';
export * from './actions';
export * from './selectors';
