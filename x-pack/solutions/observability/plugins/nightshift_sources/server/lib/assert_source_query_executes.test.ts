/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { assertSourceQueryExecutes } from './assert_source_query_executes';
import { createEsResponseError } from './es_errors.mock';

describe('assertSourceQueryExecutes', () => {
  it('accepts a single concrete index that does not exist yet', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockRejectedValue(
      createEsResponseError(
        400,
        'verification_exception',
        'Found 1 problem\nline 1:6: Unknown index [logs-none]'
      )
    );

    await expect(assertSourceQueryExecutes({ esClient, esql: 'FROM logs-none' })).resolves.toEqual({
      indexExists: false,
    });
  });
});
