/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';

import type { OutputColumns } from './types';

/** The names and ES|QL types of the columns that the query outputs, read with a request that returns no rows. */
export const fetchOutputColumns = async ({
  esClient,
  query,
  filter,
}: {
  esClient: ElasticsearchClient;
  query: string;
  filter?: estypes.QueryDslQueryContainer;
}): Promise<OutputColumns> => {
  const response = await esClient.esql.query({
    query: `${query}\n| LIMIT 0`,
    ...(filter ? { filter } : {}),
  });
  return new Map(response.columns.map(({ name, type }) => [name, type]));
};
