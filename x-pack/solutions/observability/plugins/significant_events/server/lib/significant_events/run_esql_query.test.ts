/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { runEsqlQuery } from './run_esql_query';

describe('runEsqlQuery', () => {
  it('fails the query on a shard failure instead of returning partial rows', async () => {
    const query = jest.fn().mockResolvedValue({ columns: [], values: [] });
    const esClient = { esql: { query } } as unknown as ElasticsearchClient;

    await runEsqlQuery(esClient, 'FROM x');

    expect(query).toHaveBeenCalledWith(expect.objectContaining({ allow_partial_results: false }));
  });
});
