/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorIndex, ElasticsearchIndex } from '@kbn/search-connectors';

export interface AlwaysShowPattern {
  alias_pattern: string;
  index_pattern: string;
}

export interface ElasticsearchIndexWithPrivileges extends ElasticsearchIndex {
  alias: boolean;
  privileges: {
    manage: boolean;
    read: boolean;
  };
}

export type ElasticsearchIndexWithIngestion = ElasticsearchIndex | ConnectorIndex;
