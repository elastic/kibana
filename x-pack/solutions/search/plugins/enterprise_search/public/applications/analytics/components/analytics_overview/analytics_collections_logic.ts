/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { AnalyticsCollection } from '../../../../../common/types/analytics';
import { Status } from '../../../../../common/types/api';
import { Actions } from '../../../shared/api_logic/create_api_logic';
import {
  FetchAnalyticsCollectionsAPILogic,
  FetchAnalyticsCollectionsApiLogicResponse,
} from '../../api/index/fetch_analytics_collections_api_logic';

const SEARCH_COOLDOWN = 200;

export interface AnalyticsCollectionsActions {
  fetchAnalyticsCollections(): void;
  makeRequest: Actions<{}, FetchAnalyticsCollectionsApiLogicResponse>['makeRequest'];
  searchAnalyticsCollections(query?: string): { query: string };
}
export interface AnalyticsCollectionsValues {
  analyticsCollections: AnalyticsCollection[];
  data: typeof FetchAnalyticsCollectionsAPILogic.values.data;
  hasNoAnalyticsCollections: boolean;
  isFetching: boolean;
  isSearchRequest: boolean;
  isSearching: boolean;
  searchQuery: string;
  status: Status;
}

export const AnalyticsCollectionsLogic = kea<
  MakeLogicType<AnalyticsCollectionsValues, AnalyticsCollectionsActions>
>({
  actions: {
    fetchAnalyticsCollections: true,
    searchAnalyticsCollections: (query) => ({
      query,
    }),
  },
  connect: {
    actions: [FetchAnalyticsCollectionsAPILogic, ['makeRequest']],
    values: [FetchAnalyticsCollectionsAPILogic, ['data', 'status']],
  },
  listeners: ({ actions }) => ({
    fetchAnalyticsCollections: () => {
      actions.makeRequest({});
    },
    searchAnalyticsCollections: async ({ query }, breakpoint) => {
      if (query) {
        await breakpoint(SEARCH_COOLDOWN);
      }
      actions.makeRequest({ query });
    },
  }),
  path: ['enterprise_search', 'analytics', 'collections'],
  reducers: {
    isSearchRequest: [
      false,
      {
        searchAnalyticsCollections: () => true,
      },
    ],
    searchQuery: [
      '',
      {
        searchAnalyticsCollections: (_, { query }) => query,
      },
    ],
  },
  selectors: ({ selectors }) => ({
    analyticsCollections: [() => [selectors.data], (data) => data || []],
    hasNoAnalyticsCollections: [
      () => [selectors.analyticsCollections, selectors.searchQuery],
      (analyticsCollections, searchQuery) => analyticsCollections.length === 0 && !searchQuery,
    ],
    isFetching: [
      () => [selectors.status, selectors.isSearchRequest],
      (status, isSearchRequest) =>
        [Status.LOADING, Status.IDLE].includes(status) && !isSearchRequest,
    ],
    isSearching: [
      () => [selectors.status, selectors.isSearchRequest],
      (status, isSearchRequest) => Status.LOADING === status && isSearchRequest,
    ],
  }),
});
