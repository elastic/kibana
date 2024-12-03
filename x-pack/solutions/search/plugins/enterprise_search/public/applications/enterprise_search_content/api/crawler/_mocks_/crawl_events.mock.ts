/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CrawlConfig,
  CrawlConfigFromServer,
  CrawlerStatus,
  CrawlEvent,
  CrawlEventFromServer,
  CrawlRequest,
  CrawlRequestFromServer,
  CrawlRequestStats,
  CrawlRequestStatsFromServer,
  CrawlRequestWithDetails,
  CrawlRequestWithDetailsFromServer,
  CrawlType,
} from '../types';

// Server

export const CRAWL_CONFIG_FROM_SERVER: CrawlConfigFromServer = {
  domain_allowlist: ['https://elastic.co'],
  max_crawl_depth: 2,
  seed_urls: ['https://elastic.co/guide', 'https://elastic.co/blogs'],
  sitemap_urls: ['https://elastic.co/sitemap.txt'],
};

export const CRAWL_REQUEST_FROM_SERVER: CrawlRequestFromServer = {
  began_at: '1657235281',
  completed_at: '1657235291',
  created_at: '1657235271',
  id: 'crawl-request-1',
  status: CrawlerStatus.Success,
};

export const CRAWL_REQUEST_STATS_FROM_SERVER: CrawlRequestStatsFromServer = {
  status: {
    avg_response_time_msec: 100,
    crawl_duration_msec: 5000,
    pages_visited: 20,
    status_codes: {
      '200': 20,
    },
    urls_allowed: 10,
  },
};

export const CRAWL_REQUEST_WITH_DETAILS_FROM_SERVER: CrawlRequestWithDetailsFromServer = {
  ...CRAWL_REQUEST_FROM_SERVER,
  crawl_config: CRAWL_CONFIG_FROM_SERVER,
  stats: CRAWL_REQUEST_STATS_FROM_SERVER,
  type: CrawlType.Full,
};

export const CRAWL_EVENT_FROM_SERVER: CrawlEventFromServer = {
  ...CRAWL_REQUEST_FROM_SERVER,
  crawl_config: CRAWL_CONFIG_FROM_SERVER,
  id: 'crawl-event-1',
  stage: 'crawl',
  type: CrawlType.Full,
};

// Client

export const CRAWL_CONFIG: CrawlConfig = {
  domainAllowlist: ['https://elastic.co'],
  maxCrawlDepth: 2,
  seedUrls: ['https://elastic.co/guide', 'https://elastic.co/blogs'],
  sitemapUrls: ['https://elastic.co/sitemap.txt'],
};

export const CRAWL_REQUEST: CrawlRequest = {
  beganAt: '1657235281',
  completedAt: '1657235291',
  createdAt: '1657235271',
  id: 'crawl-request-1',
  status: CrawlerStatus.Success,
};

export const CRAWL_REQUEST_STATS: CrawlRequestStats = {
  status: {
    avgResponseTimeMSec: 100,
    crawlDurationMSec: 5000,
    pagesVisited: 20,
    statusCodes: {
      '200': 20,
    },
    urlsAllowed: 10,
  },
};

export const CRAWL_REQUEST_WITH_DETAILS: CrawlRequestWithDetails = {
  ...CRAWL_REQUEST,
  crawlConfig: CRAWL_CONFIG,
  stats: CRAWL_REQUEST_STATS,
  type: CrawlType.Full,
};

export const CRAWL_EVENT: CrawlEvent = {
  ...CRAWL_REQUEST,
  crawlConfig: CRAWL_CONFIG,
  id: 'crawl-event-1',
  stage: 'crawl',
  type: CrawlType.Full,
};
