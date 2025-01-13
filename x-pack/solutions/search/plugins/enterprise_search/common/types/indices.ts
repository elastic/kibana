/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Connector, ConnectorIndex, ElasticsearchIndex } from '@kbn/search-connectors';

import { Crawler } from './crawler';

export interface AlwaysShowPattern {
  alias_pattern: string;
  index_pattern: string;
}

export interface CrawlerIndex extends ElasticsearchIndex {
  connector: Connector;
  crawler: Crawler;
}

export interface ElasticsearchIndexWithPrivileges extends ElasticsearchIndex {
  alias: boolean;
  privileges: {
    manage: boolean;
    read: boolean;
  };
}

export type ElasticsearchIndexWithIngestion = ElasticsearchIndex | ConnectorIndex | CrawlerIndex;
