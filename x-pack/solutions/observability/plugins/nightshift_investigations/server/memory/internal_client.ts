/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, ElasticsearchServiceStart } from '@kbn/core/server';

export interface MemoryInternalClient {
  getClient: () => ElasticsearchClient;
}

/**
 * Provides the plugin-owned client used only for Nightshift Semantic Memory operations.
 */
export const createMemoryInternalClient = ({
  getElasticsearch,
}: {
  getElasticsearch: () => ElasticsearchServiceStart | undefined;
}): MemoryInternalClient => ({
  getClient: () => {
    const elasticsearch = getElasticsearch();
    if (!elasticsearch) {
      throw new Error(
        'Semantic Memory internal Elasticsearch client is unavailable — ' +
          'Nightshift Investigations plugin start() has not been called'
      );
    }
    return elasticsearch.client.asInternalUser;
  },
});
