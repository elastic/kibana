/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';

/** What a route's data function needs to search Elasticsearch on behalf of the user. */
export interface SearchContext {
  esClient: ElasticsearchClient;
  /** Cancels the searches, e.g. when the HTTP request is aborted. */
  signal?: AbortSignal;
}

/**
 * The aggregations of an aggregations-only search, typed as the request asks for them;
 * `undefined` for the empty data of indices that do not exist.
 */
export const searchAggregations = async <TAggregations>(
  { esClient, signal }: SearchContext,
  request: estypes.SearchRequest
): Promise<TAggregations | undefined> => {
  const { aggregations } = await esClient.search(request, { signal });
  return aggregations as unknown as TAggregations | undefined;
};
