/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { AggregationsAggregate, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { Console, Effect } from 'effect';

export async function waitForDocumentInIndex<T>({
  esClient,
  indexName,
  docCountTarget = 1,
}: {
  esClient: Client;
  indexName: string;
  docCountTarget?: number;
}): Promise<SearchResponse<T, Record<string, AggregationsAggregate>>> {
  const search = () =>
    esClient.search<T>({ index: indexName, rest_total_hits_as_int: true }).then(inspect);

  function inspect(response) {
    if (
      !response.hits.total ||
      typeof response.hits.total !== 'number' ||
      response.hits.total < docCountTarget
    )
      throw new Error('No hits found');

    return response;
  }

  return await Effect.runPromise(
    Effect.tryPromise(search).pipe(
      Effect.retry({ times: 100 }),
      Effect.timeout('90 seconds'),
      Effect.catchAll(Console.error)
    )
  );
}

export async function waitForIndexToBeEmpty<T>({
  esClient,
  indexName,
}: {
  esClient: Client;
  indexName: string;
}): Promise<SearchResponse<T, Record<string, AggregationsAggregate>>> {
  const search = () =>
    esClient.search<T>({ index: indexName, rest_total_hits_as_int: true }).then(inspect);

  function inspect(response) {
    if (response.hits.total != null && response.hits.total > 0)
      throw new Error(`Found ${response.hits.total} docs.`);

    return response;
  }

  return await Effect.runPromise(
    Effect.tryPromise(search).pipe(
      Effect.retry({ times: 100 }),
      Effect.timeout('2 minutes'),
      Effect.catchAll(Console.error)
    )
  );
}
