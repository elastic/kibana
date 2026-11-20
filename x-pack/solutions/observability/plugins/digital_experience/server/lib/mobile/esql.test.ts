/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import { runMobileEsql, timeFilter } from './esql';

const verificationError = (reason: string) =>
  Object.assign(new Error('verification_exception'), {
    meta: { body: { error: { type: 'verification_exception', reason } } },
  });

const clientWith = (esqlCall: jest.Mock) =>
  ({ esql: esqlCall } as unknown as TracedElasticsearchClient);

describe('runMobileEsql', () => {
  const filter = { match_all: {} };
  const query = esql.from('logs-*').pipe`WHERE a == ${{ a: 'b' }}`;

  it('runs the query traced, with its params, asking for complete results as plain rows', async () => {
    const esqlCall = jest.fn().mockResolvedValue({ hits: [{ a: 1 }] });

    const rows = await runMobileEsql(clientWith(esqlCall), 'get_rows', query, filter);

    expect(rows).toEqual([{ a: 1 }]);
    expect(esqlCall).toHaveBeenCalledWith(
      'get_rows',
      {
        query: 'FROM logs-* | WHERE a == ?a',
        params: [{ a: 'b' }],
        filter,
        // A failed shard fails the query instead of undercounting.
        allow_partial_results: false,
      },
      { transform: 'plain' }
    );
  });

  it('has no rows when the indices are gone', async () => {
    const esqlCall = jest.fn().mockRejectedValue(verificationError('Unknown index [logs-*]'));

    await expect(runMobileEsql(clientWith(esqlCall), 'get_rows', query, filter)).resolves.toEqual(
      []
    );
  });

  it('fails on any other error, e.g. a failed shard', async () => {
    const esqlCall = jest.fn().mockRejectedValue(new Error('search_phase_execution_exception'));

    await expect(runMobileEsql(clientWith(esqlCall), 'get_rows', query, filter)).rejects.toThrow(
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
