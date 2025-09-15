/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { flashAPIErrors } from '../../../shared/flash_messages';

import { HttpLogic } from '../../../shared/http';
import { EngineLogic } from '../engine';

import { CrawlRequestWithDetails, CrawlRequestWithDetailsFromServer } from './types';
import { crawlRequestWithDetailsServerToClient } from './utils';

type CrawlDetailFlyoutTabs = 'preview' | 'json';

export interface CrawlDetailValues {
  crawlRequest: CrawlRequestWithDetails | null;
  crawlRequestFromServer: CrawlRequestWithDetailsFromServer | null;
  dataLoading: boolean;
  flyoutClosed: boolean;
  selectedTab: CrawlDetailFlyoutTabs;
}

export interface CrawlDetailActions {
  closeFlyout(): void;
  fetchCrawlRequest(requestId: string): { requestId: string };
  onRecieveCrawlRequest(crawlRequestFromServer: CrawlRequestWithDetailsFromServer): {
    crawlRequestFromServer: CrawlRequestWithDetailsFromServer;
  };
  openFlyout(): void;
  setSelectedTab(selectedTab: CrawlDetailFlyoutTabs): { selectedTab: CrawlDetailFlyoutTabs };
}

export const CrawlDetailLogic = kea<MakeLogicType<CrawlDetailValues, CrawlDetailActions>>({
  path: ['enterprise_search', 'app_search', 'crawler', 'crawl_detail_logic'],
  actions: {
    closeFlyout: true,
    fetchCrawlRequest: (requestId) => ({ requestId }),
    onRecieveCrawlRequest: (crawlRequestFromServer) => ({ crawlRequestFromServer }),
    openFlyout: true,
    setSelectedTab: (selectedTab) => ({ selectedTab }),
  },
  reducers: {
    crawlRequest: [
      null,
      {
        onRecieveCrawlRequest: (_, { crawlRequestFromServer }) =>
          crawlRequestWithDetailsServerToClient(crawlRequestFromServer),
      },
    ],
    crawlRequestFromServer: [
      null,
      {
        onRecieveCrawlRequest: (_, { crawlRequestFromServer }) => crawlRequestFromServer,
      },
    ],
    dataLoading: [
      true,
      {
        fetchCrawlRequest: () => true,
        onRecieveCrawlRequest: () => false,
      },
    ],
    flyoutClosed: [
      true,
      {
        openFlyout: () => false,
        closeFlyout: () => true,
      },
    ],
    selectedTab: [
      'preview',
      {
        openFlyout: () => 'preview',
        setSelectedTab: (_, { selectedTab }) => selectedTab,
      },
    ],
  },
  listeners: ({ actions }) => ({
    fetchCrawlRequest: async ({ requestId }) => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        const response = await http.get<CrawlRequestWithDetailsFromServer>(
          `/internal/app_search/engines/${engineName}/crawler/crawl_requests/${requestId}`
        );

        actions.onRecieveCrawlRequest(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
  }),
});
