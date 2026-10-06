/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, ElasticsearchServiceStart, Logger } from '@kbn/core/server';
import { ensureMemoryIndex } from './ensure_memory_index';

export interface MemoryService {
  initialize: (logger: Logger) => Promise<void>;
  getClientWhenReady: () => Promise<ElasticsearchClient>;
}

/**
 * Owns the internal client and one plugin-lifetime Semantic Memory readiness attempt.
 */
export const createMemoryService = ({
  getElasticsearch,
}: {
  getElasticsearch: () => ElasticsearchServiceStart | undefined;
}): MemoryService => {
  let readiness: Promise<void> | undefined;

  const getClient = (): ElasticsearchClient => {
    const elasticsearch = getElasticsearch();
    if (!elasticsearch) {
      throw new Error(
        'Semantic Memory internal Elasticsearch client is unavailable — ' +
          'Nightshift Investigations plugin start() has not been called'
      );
    }
    return elasticsearch.client.asInternalUser;
  };

  return {
    initialize: (logger) => {
      if (!readiness) {
        const esClient = getClient();
        readiness = ensureMemoryIndex({ esClient, logger });
        // Observe startup failures without replacing the shared rejected promise.
        void readiness.catch((error) => {
          logger.error(`Failed to ensure Semantic Memory index: ${error.message}`);
        });
      }
      return readiness;
    },
    getClientWhenReady: async () => {
      if (!readiness) {
        throw new Error(
          'Semantic Memory is not initialized — ' +
            'Nightshift Investigations plugin start() has not been called'
        );
      }
      await readiness;
      return getClient();
    },
  };
};
