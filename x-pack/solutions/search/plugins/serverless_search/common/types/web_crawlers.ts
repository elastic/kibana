/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const WEB_CRAWLERS_API_PATH = '/internal/serverless_search/web_crawlers';

export interface WebCrawlerDomain {
  url: string;
  seed_urls?: string[];
}

export interface WebCrawlerConfig {
  name: string;
  output_index: string;
  domains: WebCrawlerDomain[];
  schedule?: string;
  max_crawl_depth?: number;
}

export type WebCrawlerStatus =
  | 'pending'
  | 'healthy'
  | 'degraded'
  | 'failed'
  | 'offline'
  | 'stopped';

export interface WebCrawlerCrawl {
  crawl_id?: string;
  status?: string;
  trigger?: string;
  started_at?: string;
  finished_at?: string;
  message?: string;
}

export interface WebCrawler extends WebCrawlerConfig {
  id: string;
  agent_policy_ids: string[];
  status: WebCrawlerStatus;
  status_message?: string;
  last_crawl?: WebCrawlerCrawl;
  created_at: string;
}

export interface WebCrawlersListResponse {
  crawlers: WebCrawler[];
  agentlessEnabled: boolean;
}
