/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type {
  AggregationsAggregate,
  SearchResponse,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import pRetry from 'p-retry';

export async function waitForDocumentInIndex<T>({
  esClient,
  indexName,
  docCountTarget = 1,
}: {
  esClient: Client;
  indexName: string;
  docCountTarget?: number;
}): Promise<SearchResponse<T, Record<string, AggregationsAggregate>>> {
  return pRetry(
    async () => {
      const response = await esClient.search<T>({ index: indexName, rest_total_hits_as_int: true });
      if (!response.hits.total || response.hits.total < docCountTarget) {
        throw new Error('No hits found');
      }
      return response;
    },
    { retries: 10 }
  );
}

export async function waitForIndexToBeEmpty<T>({
  esClient,
  indexName,
}: {
  esClient: Client;
  indexName: string;
}): Promise<SearchResponse<T, Record<string, AggregationsAggregate>>> {
  return pRetry(
    async () => {
      const response = await esClient.search<T>({ index: indexName, rest_total_hits_as_int: true });
      if (response.hits.total != null && response.hits.total > 0) {
        throw new Error(`Found ${response.hits.total} docs.`);
      }
      return response;
    },
    { retries: 10 }
  );
}
