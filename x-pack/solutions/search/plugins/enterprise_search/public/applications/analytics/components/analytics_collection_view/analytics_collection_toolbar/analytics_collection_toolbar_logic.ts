/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { RefreshInterval } from '@kbn/data-plugin/common';

import { TimeRange } from '@kbn/es-query';

import { KibanaLogic } from '../../../../shared/kibana/kibana_logic';

export interface AnalyticsCollectionToolbarLogicActions {
  onTimeRefresh(): void;
  setDataViewId(id: string): { id: string };
  setRefreshInterval(refreshInterval: RefreshInterval): RefreshInterval;
  setSearchSessionId(searchSessionId: string | null): {
    searchSessionId: string | null;
  };
  setTimeRange(timeRange: TimeRange): TimeRange;
}
export interface AnalyticsCollectionToolbarLogicValues {
  // kea forbid to set undefined as a value
  _searchSessionId: string | null;
  refreshInterval: RefreshInterval;
  searchSessionId: string | undefined;
  timeRange: TimeRange;
}

const DEFAULT_TIME_RANGE = { from: 'now-7d', to: 'now' };
const DEFAULT_REFRESH_INTERVAL = { pause: true, value: 10000 };

export const AnalyticsCollectionToolbarLogic = kea<
  MakeLogicType<AnalyticsCollectionToolbarLogicValues, AnalyticsCollectionToolbarLogicActions>
>({
  actions: {
    onTimeRefresh: true,
    setRefreshInterval: ({ pause, value }) => ({ pause, value }),
    setSearchSessionId: (searchSessionId) => ({ searchSessionId }),
    setTimeRange: ({ from, to }) => ({ from, to }),
  },
  listeners: ({ actions }) => ({
    onTimeRefresh() {
      actions.setSearchSessionId(KibanaLogic.values.data?.search.session.start() || '');
    },
    setRefreshInterval(refreshInterval) {
      if (refreshInterval.pause) {
        actions.setSearchSessionId(null);
      }
    },
    setTimeRange() {
      actions.setSearchSessionId(null);
    },
  }),
  path: ['enterprise_search', 'analytics', 'collection', 'toolbar'],
  reducers: () => ({
    _searchSessionId: [
      null,
      { setSearchSessionId: (state, { searchSessionId }) => searchSessionId },
    ],
    refreshInterval: [
      DEFAULT_REFRESH_INTERVAL,
      {
        setRefreshInterval: (_, { pause, value }) => ({
          pause,
          value,
        }),
      },
    ],
    timeRange: [
      DEFAULT_TIME_RANGE,
      {
        setTimeRange: (state, { from, to }) => ({
          ...state,
          from,
          to,
        }),
      },
    ],
  }),
  selectors: () => ({
    searchSessionId: [
      (selectors) => [selectors._searchSessionId],
      (searchSessionId) => searchSessionId || undefined,
    ],
  }),
});
