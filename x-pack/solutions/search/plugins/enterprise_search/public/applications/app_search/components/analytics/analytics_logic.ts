/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';
import queryString from 'query-string';

import { flashAPIErrors } from '../../../shared/flash_messages';
import { HttpLogic } from '../../../shared/http';
import { KibanaLogic } from '../../../shared/kibana';
import { EngineLogic } from '../engine';

import { DEFAULT_START_DATE, DEFAULT_END_DATE } from './constants';
import { AnalyticsData, QueryDetails } from './types';

interface AnalyticsValues extends AnalyticsData, QueryDetails {
  dataLoading: boolean;
}

interface AnalyticsActions {
  onAnalyticsDataLoad(data: AnalyticsData): AnalyticsData;
  onQueryDataLoad(data: QueryDetails): QueryDetails;
  loadAnalyticsData(): void;
  loadQueryData(query: string): string;
}

export const AnalyticsLogic = kea<MakeLogicType<AnalyticsValues, AnalyticsActions>>({
  path: ['enterprise_search', 'app_search', 'analytics_logic'],
  actions: () => ({
    onAnalyticsDataLoad: (data) => data,
    onQueryDataLoad: (data) => data,
    loadAnalyticsData: true,
    loadQueryData: (query) => query,
  }),
  reducers: () => ({
    dataLoading: [
      true,
      {
        loadAnalyticsData: () => true,
        loadQueryData: () => true,
        onAnalyticsDataLoad: () => false,
        onQueryDataLoad: () => false,
      },
    ],
    allTags: [
      [],
      {
        onAnalyticsDataLoad: (_, { allTags }) => allTags,
        onQueryDataLoad: (_, { allTags }) => allTags,
      },
    ],
    recentQueries: [
      [],
      {
        onAnalyticsDataLoad: (_, { recentQueries }) => recentQueries,
      },
    ],
    topQueries: [
      [],
      {
        onAnalyticsDataLoad: (_, { topQueries }) => topQueries,
      },
    ],
    topQueriesNoResults: [
      [],
      {
        onAnalyticsDataLoad: (_, { topQueriesNoResults }) => topQueriesNoResults,
      },
    ],
    topQueriesNoClicks: [
      [],
      {
        onAnalyticsDataLoad: (_, { topQueriesNoClicks }) => topQueriesNoClicks,
      },
    ],
    topQueriesWithClicks: [
      [],
      {
        onAnalyticsDataLoad: (_, { topQueriesWithClicks }) => topQueriesWithClicks,
      },
    ],
    totalQueries: [
      0,
      {
        onAnalyticsDataLoad: (_, { totalQueries }) => totalQueries,
      },
    ],
    totalQueriesNoResults: [
      0,
      {
        onAnalyticsDataLoad: (_, { totalQueriesNoResults }) => totalQueriesNoResults,
      },
    ],
    totalClicks: [
      0,
      {
        onAnalyticsDataLoad: (_, { totalClicks }) => totalClicks,
      },
    ],
    queriesPerDay: [
      [],
      {
        onAnalyticsDataLoad: (_, { queriesPerDay }) => queriesPerDay,
      },
    ],
    queriesNoResultsPerDay: [
      [],
      {
        onAnalyticsDataLoad: (_, { queriesNoResultsPerDay }) => queriesNoResultsPerDay,
      },
    ],
    clicksPerDay: [
      [],
      {
        onAnalyticsDataLoad: (_, { clicksPerDay }) => clicksPerDay,
      },
    ],
    totalQueriesForQuery: [
      0,
      {
        onQueryDataLoad: (_, { totalQueriesForQuery }) => totalQueriesForQuery,
      },
    ],
    queriesPerDayForQuery: [
      [],
      {
        onQueryDataLoad: (_, { queriesPerDayForQuery }) => queriesPerDayForQuery,
      },
    ],
    topClicksForQuery: [
      [],
      {
        onQueryDataLoad: (_, { topClicksForQuery }) => topClicksForQuery,
      },
    ],
    startDate: [
      '',
      {
        onAnalyticsDataLoad: (_, { startDate }) => startDate,
        onQueryDataLoad: (_, { startDate }) => startDate,
      },
    ],
  }),
  listeners: ({ actions }) => ({
    loadAnalyticsData: async () => {
      const { history } = KibanaLogic.values;
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        const { start, end, tag } = queryString.parse(history.location.search);
        const query = {
          start: start || DEFAULT_START_DATE,
          end: end || DEFAULT_END_DATE,
          tag,
          size: 20,
        };
        const url = `/internal/app_search/engines/${engineName}/analytics/queries`;

        const response = await http.get<AnalyticsData>(url, { query });
        actions.onAnalyticsDataLoad(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    loadQueryData: async (query) => {
      const { history } = KibanaLogic.values;
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        const { start, end, tag } = queryString.parse(history.location.search);
        const queryParams = {
          start: start || DEFAULT_START_DATE,
          end: end || DEFAULT_END_DATE,
          tag,
        };
        const url = `/internal/app_search/engines/${engineName}/analytics/queries/${query}`;

        const response = await http.get<QueryDetails>(url, { query: queryParams });

        actions.onQueryDataLoad(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
  }),
});
