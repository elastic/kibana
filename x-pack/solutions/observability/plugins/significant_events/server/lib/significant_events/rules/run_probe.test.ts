/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_TEXT_LENGTH } from '@kbn/significant-events-schema';
import { isProbeableQuery, runProbe, runStoredQuery, type ProbeWindow } from './run_probe';

const STORED_QUERY =
  'FROM $.logs-checkout | WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend | WHERE x == 1';
const WINDOW: ProbeWindow = { from: '2026-10-15T10:00:00.000Z', to: '2026-10-15T11:00:00.000Z' };

type QueryMock = jest.Mock<Promise<{ values: unknown[][] }>, [unknown, { signal: AbortSignal }]>;

const respondsWith = (values: unknown[][]): QueryMock =>
  jest.fn<Promise<{ values: unknown[][] }>, [unknown, { signal: AbortSignal }]>(async () => ({
    values,
  }));

const rejectsWith = (message: string): QueryMock =>
  jest.fn<Promise<{ values: unknown[][] }>, [unknown, { signal: AbortSignal }]>(async () => {
    throw new Error(message);
  });

const createEsClient = (impl: QueryMock) => ({
  esClient: { esql: { query: impl } } as never,
  query: impl,
});

/** A request that only ends when its signal aborts, like a query still running in ES. */
const hangsUntilAborted = (): QueryMock =>
  jest.fn(
    (_request, { signal }) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new Error('request aborted')));
      })
  );

const baseParams = (overrides: Partial<Parameters<typeof runStoredQuery>[0]> = {}) => ({
  query: STORED_QUERY,
  window: WINDOW,
  timeoutMs: 1_000,
  deadlineAt: Date.now() + 60_000,
  abortSignal: new AbortController().signal,
  ...overrides,
});

/** `runProbe` over a real `runStoredQuery`, with the client and the limits of `baseParams`. */
const probe = (
  esClient: Parameters<typeof runStoredQuery>[0]['esClient'],
  overrides: Parameters<typeof baseParams>[0] = {}
) => {
  const { query, window, ...runtime } = baseParams(overrides);
  return runProbe({
    query,
    window,
    run: (params) => runStoredQuery({ ...params, ...runtime, esClient }),
  });
};

describe('isProbeableQuery', () => {
  it('accepts a FROM query that takes both time placeholders', () => {
    expect(isProbeableQuery(STORED_QUERY)).toBe(true);
    expect(
      isProbeableQuery(`  from $.a | WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend`)
    ).toBe(true);
  });

  it.each([
    ['undefined', undefined],
    ['empty', ''],
    ['not a FROM query', 'ROW x = 1 | WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend'],
    ['missing ?_tstart', 'FROM $.a | WHERE @timestamp < ?_tend'],
    ['missing ?_tend', 'FROM $.a | WHERE @timestamp >= ?_tstart'],
    ['over the length bound', `${STORED_QUERY} | WHERE y == "${'a'.repeat(MAX_TEXT_LENGTH)}"`],
    ['aggregating, whose rows do not mean a match', `${STORED_QUERY} | STATS c = COUNT(*)`],
  ])('rejects a query that is %s', (_name, query) => {
    expect(isProbeableQuery(query)).toBe(false);
  });
});

describe('runProbe', () => {
  it('issues the stored query with LIMIT 1, named window params and a signal', async () => {
    const { esClient, query } = createEsClient(respondsWith([['row']]));

    const result = await probe(esClient);

    expect(result).toEqual({ status: 'ok', hasRows: true, durationMs: expect.any(Number) });
    expect(query).toHaveBeenCalledTimes(1);
    const [request, options] = query.mock.calls[0];
    expect(request).toEqual({
      query: `${STORED_QUERY}\n| LIMIT 1`,
      params: [{ _tstart: WINDOW.from }, { _tend: WINDOW.to }],
    });
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });

  it('appends any tail on its own line, so a trailing comment cannot swallow it, and returns the rows', async () => {
    const { esClient, query } = createEsClient(respondsWith([['bucket', 3]]));

    const result = await runStoredQuery({
      esClient,
      ...baseParams({ query: `${STORED_QUERY} // a comment` }),
      tail: 'KEEP b, c',
    });

    expect(result).toMatchObject({ status: 'ok', values: [['bucket', 3]] });
    expect(query.mock.calls[0][0]).toMatchObject({
      query: `${STORED_QUERY} // a comment\n| KEEP b, c`,
    });
  });

  it('reports no rows when the query returns none', async () => {
    const { esClient } = createEsClient(respondsWith([]));

    expect(await probe(esClient)).toMatchObject({
      status: 'ok',
      hasRows: false,
    });
  });

  it.each([
    ['missing', undefined],
    ['not a FROM query', 'ROW x = 1'],
    ['without time placeholders', 'FROM $.a | WHERE x == 1'],
  ])('returns no_query without issuing a request when the stored query is %s', async (_n, q) => {
    const { esClient, query } = createEsClient(respondsWith([]));

    expect(await probe(esClient, { query: q })).toMatchObject({
      status: 'no_query',
      hasRows: false,
    });
    expect(query).not.toHaveBeenCalled();
  });

  it('returns error when the request fails', async () => {
    const { esClient } = createEsClient(rejectsWith('security_exception'));

    expect(await probe(esClient)).toMatchObject({
      status: 'error',
      hasRows: false,
    });
  });

  it('returns timeout when the probe outlives its per-probe timeout', async () => {
    const { esClient } = createEsClient(hangsUntilAborted());

    const result = await probe(esClient, { timeoutMs: 15 });

    expect(result).toMatchObject({ status: 'timeout', hasRows: false });
  });

  it('caps the per-probe timeout at the time left before the shared deadline', async () => {
    const { esClient } = createEsClient(hangsUntilAborted());
    const startedAt = Date.now();

    const result = await probe(esClient, { timeoutMs: 60_000, deadlineAt: startedAt + 20 });

    expect(result.status).toBe('timeout');
    expect(Date.now() - startedAt).toBeLessThan(5_000);
  });

  it('does not issue a request once the shared deadline has passed', async () => {
    const { esClient, query } = createEsClient(respondsWith([['row']]));

    const result = await probe(esClient, { deadlineAt: Date.now() - 1 });

    expect(result).toMatchObject({ status: 'timeout', hasRows: false });
    expect(query).not.toHaveBeenCalled();
  });

  it('does not issue a request when the step is already aborted', async () => {
    const { esClient, query } = createEsClient(respondsWith([['row']]));
    const controller = new AbortController();
    controller.abort();

    const result = await probe(esClient, { abortSignal: controller.signal });

    expect(result).toMatchObject({ status: 'aborted', hasRows: false });
    expect(query).not.toHaveBeenCalled();
  });

  it('returns aborted when the step aborts while the request is in flight', async () => {
    const { esClient, query } = createEsClient(hangsUntilAborted());
    const controller = new AbortController();

    const pending = probe(esClient, { abortSignal: controller.signal });
    expect(query).toHaveBeenCalled();
    controller.abort();

    expect(await pending).toMatchObject({ status: 'aborted', hasRows: false });
  });
});
