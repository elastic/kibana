/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { buildProbeQuery } from '../generator';
import { probeSources } from './source_probe';

const responseError = (statusCode: number, type: string, reason: string) =>
  new errors.ResponseError({
    statusCode,
    body: { error: { type, reason }, status: statusCode },
    headers: {},
    warnings: [],
    meta: {} as never,
  });

const probeResponse = (type?: string) => ({
  columns: type === undefined ? [] : [{ name: '@timestamp', type }],
  values: [],
});

const setup = (answer: (query: string) => Promise<Record<string, unknown>>) => {
  const client = elasticsearchServiceMock.createElasticsearchClient();
  // The mock's resolved type is the client's response, which lacks the execution metadata.
  client.esql.query.mockImplementation((({ query }: { query: string }) => answer(query)) as never);
  return client;
};

const patternOf = (query: string): string => {
  const match = /^TS (\S+)$/m.exec(query);
  if (!match) {
    throw new Error(`not a probe: ${query}`);
  }
  return match[1];
};

describe('probeSources', () => {
  it.each([
    ['date', true],
    ['date_nanos', true],
    ['null', false],
    ['keyword', true],
  ])('reads @timestamp of type %s as hasTimeSeries %s', async (type, hasTimeSeries) => {
    const client = setup(async () => probeResponse(type));

    const results = await probeSources(client, ['metrics-*']);

    expect(results.get('metrics-*')).toEqual({ failed: false, hasTimeSeries });
  });

  it('reads a response without @timestamp as no time-series index', async () => {
    const client = setup(async () => probeResponse());

    expect((await probeSources(client, ['metrics-*'])).get('metrics-*')).toEqual({
      failed: false,
      hasTimeSeries: false,
    });
  });

  it('sends no probe when a later pattern is unsafe', async () => {
    const client = setup(async () => probeResponse('date'));

    await expect(probeSources(client, ['metrics-*', 'metrics-*,logs-*'])).rejects.toThrow(
      '"metrics-*,logs-*"'
    );
    expect(client.esql.query).not.toHaveBeenCalled();
  });

  it('sends the probe query of the pattern', async () => {
    const client = setup(async () => probeResponse('date'));

    await probeSources(client, ['metrics-*']);

    const [body] = client.esql.query.mock.calls[0];
    const { esql, params } = buildProbeQuery('metrics-*');
    expect(body).toEqual({ query: esql, params, include_execution_metadata: true });
  });

  it('reads a verification error as no time-series index', async () => {
    const client = setup(async () => {
      throw responseError(400, 'verification_exception', 'Found 1 problem');
    });

    expect((await probeSources(client, ['logs-app'])).get('logs-app')).toEqual({
      failed: false,
      hasTimeSeries: false,
    });
  });

  it.each([
    [500, 'search_phase_execution_exception', 'all shards failed'],
    [429, 'es_rejected_execution_exception', 'rejected execution'],
  ])('reports a %s as a failure with its status and reason', async (status, type, reason) => {
    const client = setup(async () => {
      throw responseError(status, type, reason);
    });

    expect((await probeSources(client, ['metrics-*'])).get('metrics-*')).toEqual({
      failed: true,
      status,
      reason: `${type}: ${reason}`,
    });
  });

  it('reports an error without an Elasticsearch response as a failure with no status', async () => {
    const client = setup(async () => {
      throw new Error('connection reset');
    });

    expect((await probeSources(client, ['metrics-*'])).get('metrics-*')).toEqual({
      failed: true,
      status: null,
      reason: 'connection reset',
    });
  });

  it('does not read a 400 that is not a verification error as no time-series index', async () => {
    const client = setup(async () => {
      throw responseError(400, 'parsing_exception', 'verification_exception');
    });

    expect((await probeSources(client, ['metrics-*'])).get('metrics-*')).toEqual({
      failed: true,
      status: 400,
      reason: 'parsing_exception: verification_exception',
    });
  });

  it('probes a duplicate pattern once', async () => {
    const client = setup(async () => probeResponse('date'));

    const results = await probeSources(client, ['metrics-*', 'logs-*', 'metrics-*']);

    expect(client.esql.query).toHaveBeenCalledTimes(2);
    expect([...results.keys()]).toEqual(['metrics-*', 'logs-*']);
  });

  it('keys results per pattern when one fails and another succeeds', async () => {
    const client = setup(async (query) => {
      if (patternOf(query) === 'logs-*') {
        throw responseError(503, 'unavailable_shards_exception', 'no shard available');
      }
      return probeResponse('date');
    });

    const results = await probeSources(client, ['metrics-*', 'logs-*']);

    expect(results).toEqual(
      new Map([
        ['metrics-*', { failed: false, hasTimeSeries: true }],
        [
          'logs-*',
          {
            failed: true,
            status: 503,
            reason: 'unavailable_shards_exception: no shard available',
          },
        ],
      ])
    );
  });

  it('passes the abort signal to every probe', async () => {
    const client = setup(async () => probeResponse('date'));
    const { signal } = new AbortController();

    await probeSources(client, ['metrics-*', 'logs-*'], { signal });

    expect(client.esql.query.mock.calls.map(([, options]) => options)).toEqual([
      { signal },
      { signal },
    ]);
  });
});
