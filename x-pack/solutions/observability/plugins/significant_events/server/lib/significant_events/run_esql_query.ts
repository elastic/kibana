/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { isEsqlUnknownIndexError } from '@kbn/storage-adapter';

/**
 * Runs an ES|QL query and returns `undefined` when the target index or data
 * stream has not been created yet (lazy initialization before first write).
 *
 * A shard failure fails the query instead of returning the rows of the shards that answered. The
 * knowledge indicator reads use this, and callers such as the rule reconciler delete what is
 * missing from a read, so a short list must never pass for the full one.
 */
export const runEsqlQuery = async (
  esClient: ElasticsearchClient,
  query: string
): Promise<ESQLSearchResponse | undefined> => {
  try {
    return (await esClient.esql.query({
      query,
      allow_partial_results: false,
    })) as ESQLSearchResponse;
  } catch (error) {
    if (isEsqlUnknownIndexError(error)) {
      return undefined;
    }
    throw error;
  }
};
