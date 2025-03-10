/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorStatus, SyncStatus } from '@kbn/search-connectors';

// See SharedTogo::Crawler::Status for details on how these are generated
export enum CrawlerStatus {
  Pending = 'pending',
  Suspended = 'suspended',
  Starting = 'starting',
  Running = 'running',
  Suspending = 'suspending',
  Canceling = 'canceling',
  Success = 'success',
  Failed = 'failed',
  Canceled = 'canceled',
  Skipped = 'skipped',
}

const crawlerStatusSyncMap: Record<CrawlerStatus, SyncStatus> = {
  [CrawlerStatus.Canceling]: SyncStatus.CANCELING,
  [CrawlerStatus.Canceled]: SyncStatus.CANCELED,
  [CrawlerStatus.Failed]: SyncStatus.ERROR,
  [CrawlerStatus.Pending]: SyncStatus.PENDING,
  [CrawlerStatus.Running]: SyncStatus.IN_PROGRESS,
  [CrawlerStatus.Skipped]: SyncStatus.CANCELED,
  [CrawlerStatus.Starting]: SyncStatus.PENDING,
  [CrawlerStatus.Success]: SyncStatus.COMPLETED,
  [CrawlerStatus.Suspended]: SyncStatus.SUSPENDED,
  [CrawlerStatus.Suspending]: SyncStatus.IN_PROGRESS,
};

const crawlerStatusConnectorStatusMap: Record<CrawlerStatus, ConnectorStatus> = {
  [CrawlerStatus.Canceling]: ConnectorStatus.CONNECTED,
  [CrawlerStatus.Canceled]: ConnectorStatus.CONNECTED,
  [CrawlerStatus.Failed]: ConnectorStatus.ERROR,
  [CrawlerStatus.Pending]: ConnectorStatus.CONNECTED,
  [CrawlerStatus.Running]: ConnectorStatus.CONNECTED,
  [CrawlerStatus.Skipped]: ConnectorStatus.CONNECTED,
  [CrawlerStatus.Starting]: ConnectorStatus.CONNECTED,
  [CrawlerStatus.Success]: ConnectorStatus.CONNECTED,
  [CrawlerStatus.Suspended]: ConnectorStatus.CONNECTED,
  [CrawlerStatus.Suspending]: ConnectorStatus.CONNECTED,
};

export const crawlerStatusToSyncStatus = (crawlerStatus: CrawlerStatus): SyncStatus => {
  return crawlerStatusSyncMap[crawlerStatus];
};

export const crawlerStatusToConnectorStatus = (crawlerStatus: CrawlerStatus): ConnectorStatus => {
  return crawlerStatusConnectorStatusMap[crawlerStatus];
};

export interface CrawlRequest {
  configuration_oid: string;
  id: string;
  status: CrawlerStatus;
}
export interface Crawler {
  id: string;
  index_name: string;
  most_recent_crawl_request_status?: CrawlerStatus;
}

export interface CrawlerCustomScheduleConfigOverridesServer {
  max_crawl_depth?: number;
  sitemap_discovery_disabled?: boolean;
  domain_allowlist?: string[];
  sitemap_urls?: string[];
  seed_urls?: string[];
}

export interface CrawlerCustomScheduleServer {
  name: string;
  interval: string;
  configuration_overrides: CrawlerCustomScheduleConfigOverridesServer;
  enabled: boolean;
}

export type CrawlerCustomScheduleMappingServer = Map<string, CrawlerCustomScheduleServer>;

export interface CrawlerCustomSchedulesServer {
  custom_scheduling: CrawlerCustomScheduleMappingServer;
}

export interface CrawlerCustomScheduleConfigOverridesClient {
  maxCrawlDepth?: number;
  sitemapDiscoveryDisabled?: boolean;
  domainAllowlist?: string[];
  sitemapUrls?: string[];
  seedUrls?: string[];
}

export interface CrawlerCustomScheduleClient {
  name: string;
  interval: string;
  configurationOverrides: CrawlerCustomScheduleConfigOverridesClient;
  enabled: boolean;
}

export type CrawlerCustomScheduleMappingClient = Map<string, CrawlerCustomScheduleClient>;
