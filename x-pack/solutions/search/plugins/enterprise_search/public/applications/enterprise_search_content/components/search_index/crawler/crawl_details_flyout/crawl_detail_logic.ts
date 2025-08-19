/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { flashAPIErrors } from '../../../../../shared/flash_messages';
import { HttpLogic } from '../../../../../shared/http';

import {
  CrawlRequestWithDetails,
  CrawlRequestWithDetailsFromServer,
} from '../../../../api/crawler/types';
import { crawlRequestWithDetailsServerToClient } from '../../../../api/crawler/utils';
import { IndexNameLogic } from '../../index_name_logic';

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
  setSelectedTab(selectedTab: CrawlDetailFlyoutTabs): { selectedTab: CrawlDetailFlyoutTabs };
}

export const CrawlDetailLogic = kea<MakeLogicType<CrawlDetailValues, CrawlDetailActions>>({
  path: ['enterprise_search', 'crawler', 'crawl_detail_logic'],
  actions: {
    closeFlyout: true,
    fetchCrawlRequest: (requestId) => ({ requestId }),
    onRecieveCrawlRequest: (crawlRequestFromServer) => ({ crawlRequestFromServer }),
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
        fetchCrawlRequest: () => false,
        closeFlyout: () => true,
      },
    ],
    selectedTab: [
      'preview',
      {
        fetchCrawlRequest: () => 'preview',
        setSelectedTab: (_, { selectedTab }) => selectedTab,
      },
    ],
  },
  listeners: ({ actions }) => ({
    fetchCrawlRequest: async ({ requestId }) => {
      const { http } = HttpLogic.values;
      const { indexName } = IndexNameLogic.values;

      try {
        const response = await http.get<CrawlRequestWithDetailsFromServer>(
          `/internal/enterprise_search/indices/${indexName}/crawler/crawl_requests/${requestId}`
        );

        actions.onRecieveCrawlRequest(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
  }),
});
