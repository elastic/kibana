/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { esql } from '@elastic/esql';
import {
  createTracedEsClientMock,
  esqlResponse,
} from './create_digital_experience_traced_es_client.test_helpers';
import { runEsql, timeFilter } from './esql';

const verificationError = (reason: string) =>
  new errors.ResponseError({
    statusCode: 400,
    body: { error: { type: 'verification_exception', reason } },
    headers: {},
    warnings: null,
    meta: {} as never,
  });

describe('runEsql', () => {
  const filter = { match_all: {} };
  const query = esql.from('logs-*').pipe`WHERE a == ${{ a: 'b' }}`;

  it('runs the query with its params, asking for complete results, and returns plain rows', async () => {
    const { client, esClient } = createTracedEsClientMock();
    client.esql.query.mockResolvedValue(esqlResponse([{ a: 1 }, { a: 2 }]));

    const rows = await runEsql(esClient, 'get_rows', query, filter);

    expect(rows).toEqual([{ a: 1 }, { a: 2 }]);
    expect(client.esql.query).toHaveBeenCalledWith(
      {
        query: 'FROM logs-* | WHERE a == ?a',
        params: [{ a: 'b' }],
        filter,
        // A failed shard fails the query instead of undercounting.
        allow_partial_results: false,
      },
      expect.anything()
    );
  });

  it('has no rows when an index it names does not exist', async () => {
    const { client, esClient } = createTracedEsClientMock();
    client.esql.query.mockRejectedValue(verificationError('Unknown index [logs-missing]'));

    await expect(runEsql(esClient, 'get_rows', query, filter)).resolves.toEqual([]);
  });

  it('fails on any other error, e.g. another verification problem or a failed shard', async () => {
    const { client, esClient } = createTracedEsClientMock();
    client.esql.query.mockRejectedValueOnce(verificationError('Unknown column [b]'));
    client.esql.query.mockRejectedValueOnce(new Error('search_phase_execution_exception'));

    await expect(runEsql(esClient, 'get_rows', query, filter)).rejects.toThrow(
      'verification_exception'
    );
    await expect(runEsql(esClient, 'get_rows', query, filter)).rejects.toThrow(
      'search_phase_execution_exception'
    );
  });
});

describe('timeFilter', () => {
  it('leaves out the end, so a period and the one before it share no document', () => {
    expect(timeFilter(1000, 2000, undefined)).toEqual({
      bool: {
        filter: [
          { range: { '@timestamp': { gte: 1000, lt: 2000, format: 'epoch_millis' } } },
          { match_all: {} },
        ],
      },
    });
  });
});
