/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { runEsql, timeFilter } from './esql';

const verificationError = (reason: string) =>
  Object.assign(new Error('verification_exception'), {
    meta: { body: { error: { type: 'verification_exception', reason } } },
  });

describe('runEsql', () => {
  const filter = { match_all: {} };
  const QUERY = { query: 'FROM x | WHERE a == ?a', params: [{ a: 'b' }] };

  it('asks for complete results, so a failed shard fails the query instead of undercounting', async () => {
    const query = jest.fn().mockResolvedValue({ columns: [], values: [] });
    const esClient = { esql: { query } } as unknown as ElasticsearchClient;

    await runEsql(esClient, QUERY, filter);

    expect(query).toHaveBeenCalledWith(
      expect.objectContaining({ ...QUERY, filter, allow_partial_results: false }),
      expect.anything()
    );
  });

  it('fails when a shard fails', async () => {
    const esClient = {
      esql: { query: jest.fn().mockRejectedValue(new Error('search_phase_execution_exception')) },
    } as unknown as ElasticsearchClient;

    await expect(runEsql(esClient, QUERY, filter)).rejects.toThrow(
      'search_phase_execution_exception'
    );
  });

  it('has no rows when the indices are gone', async () => {
    const esClient = {
      esql: { query: jest.fn().mockRejectedValue(verificationError('Unknown index [logs-*]')) },
    } as unknown as ElasticsearchClient;

    await expect(runEsql(esClient, QUERY, filter)).resolves.toEqual([]);
  });

  it('fails on any other verification error, e.g. a broken query', async () => {
    const esClient = {
      esql: {
        query: jest
          .fn()
          .mockRejectedValue(verificationError('Unknown column [attributes.exception.type]')),
      },
    } as unknown as ElasticsearchClient;

    await expect(runEsql(esClient, QUERY, filter)).rejects.toThrow('verification_exception');
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
