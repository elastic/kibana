/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface InitialAppData {
  features?: ProductFeatures;
  kibanaVersion?: string;
}

export interface ProductFeatures {
  hasConnectors: boolean;
  hasDefaultIngestPipeline: boolean;
  hasDocumentLevelSecurityEnabled: boolean;
  hasIncrementalSyncEnabled: boolean;
  hasNativeConnectors: boolean;
  hasWebCrawler: boolean;
}

export interface SearchOAuth {
  clientId: string;
  redirectUrl: string;
}

export interface MetaPage {
  current: number;
  size: number;
  total_pages: number;
  total_results: number;
}

export interface Meta {
  page: MetaPage;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ClientConfigType {}

export type { ConnectorStats } from './connector_stats';
export type { ElasticsearchIndexWithPrivileges } from './indices';
export type { KibanaDeps } from './kibana_deps';
