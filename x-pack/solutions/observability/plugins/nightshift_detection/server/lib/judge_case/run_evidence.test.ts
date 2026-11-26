/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { EVIDENCE_MAX_CELL_LENGTH } from './evidence_types';
import { runEvidence } from './run_evidence';

const QUERY = 'FROM logs | WHERE message : "timeout" | LIMIT 100 | KEEP message, count';

type TestClient = ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

interface TestResponse {
  columns?: Array<{ name: string; type: string }>;
  values?: Array<Array<string | number | boolean | null | string[] | { k: number }>>;
}

function createClient(): TestClient {
  return elasticsearchServiceMock.createElasticsearchClient();
}

function respondWith(esClient: TestClient, response: TestResponse): void {
  esClient.esql.query.mockResolvedValue(response as never);
}

function table(names: string[], values: TestResponse['values']): TestResponse {
  return { columns: names.map((name) => ({ name, type: 'keyword' })), values };
}

/** A query that stays open until the signal it is given aborts, like a slow Elasticsearch. */
function hangUntilAborted(esClient: TestClient): void {
  esClient.esql.query.mockImplementation(
    ((_params: object, options?: { signal?: AbortSignal }) =>
      new Promise((_resolve, reject) => {
        options?.signal?.addEventListener('abort', () => reject(new Error('socket closed')));
      })) as never
  );
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('runEvidence', () => {
  describe('found', () => {
    it('keeps the rows, keyed by column name, with neither flag set', async () => {
      const esClient = createClient();
      respondWith(esClient, table(['message', 'count'], [['timeout calling cart', 3]]));

      expect(await runEvidence({ esClient, query: QUERY })).toEqual({
        result: 'found',
        rows: [{ message: 'timeout calling cart', count: 3 }],
        rows_returned: 1,
        rows_truncated: false,
        cells_truncated: false,
      });
    });

    it('does not flag exactly 5 rows', async () => {
      const esClient = createClient();
      respondWith(esClient, table(['n'], [[1], [2], [3], [4], [5]]));

      const result = await runEvidence({ esClient, query: QUERY });

      expect(result).toMatchObject({ result: 'found', rows_returned: 5, rows_truncated: false });
    });

    it('keeps the first 5 rows and flags the rest as left out', async () => {
      const esClient = createClient();
      respondWith(esClient, table(['n'], [[1], [2], [3], [4], [5], [6]]));

      expect(await runEvidence({ esClient, query: QUERY })).toEqual({
        result: 'found',
        rows: [{ n: 1 }, { n: 2 }, { n: 3 }, { n: 4 }, { n: 5 }],
        rows_returned: 6,
        rows_truncated: true,
        cells_truncated: false,
      });
    });

    it('caps a query with no LIMIT, which returns 1,000 rows by default', async () => {
      const esClient = createClient();
      respondWith(
        esClient,
        table(
          ['n'],
          Array.from({ length: 1000 }, (_, index) => [index])
        )
      );

      const result = await runEvidence({ esClient, query: 'FROM logs' });

      expect(result).toMatchObject({ result: 'found', rows_returned: 1000, rows_truncated: true });
      expect(result.result === 'found' && result.rows).toHaveLength(5);
    });

    it('leaves numbers, booleans and null unchanged', async () => {
      const esClient = createClient();
      respondWith(esClient, table(['a', 'b', 'c', 'd'], [[1.5, true, null, 0]]));

      const result = await runEvidence({ esClient, query: QUERY });

      expect(result.result === 'found' && result.rows).toEqual([
        { a: 1.5, b: true, c: null, d: 0 },
      ]);
    });

    it('serializes an array cell and an object cell to strings', async () => {
      const esClient = createClient();
      respondWith(esClient, table(['list', 'object'], [[['a', 'b'], { k: 1 }]]));

      const result = await runEvidence({ esClient, query: QUERY });

      expect(result.result === 'found' && result.rows).toEqual([
        { list: '["a","b"]', object: '{"k":1}' },
      ]);
    });
  });

  describe('cells', () => {
    it('cuts a cell of 501 characters to 500 and flags it', async () => {
      const esClient = createClient();
      respondWith(esClient, table(['message'], [['x'.repeat(EVIDENCE_MAX_CELL_LENGTH + 1)]]));

      const result = await runEvidence({ esClient, query: QUERY });

      expect(result).toMatchObject({ cells_truncated: true, rows_truncated: false });
      expect(result.result === 'found' && result.rows[0].message).toBe('x'.repeat(500));
    });

    it('does not flag a cell of exactly 500 characters', async () => {
      const esClient = createClient();
      respondWith(esClient, table(['message'], [['x'.repeat(EVIDENCE_MAX_CELL_LENGTH)]]));

      expect(await runEvidence({ esClient, query: QUERY })).toMatchObject({
        cells_truncated: false,
      });
    });

    it('leaves no lone surrogate when the cut falls inside a character outside the BMP', async () => {
      const esClient = createClient();
      // The emoji takes code units 499 and 500, so a cut at 500 would keep only its first half.
      respondWith(esClient, table(['message'], [['x'.repeat(499) + '😀' + 'y']]));

      const result = await runEvidence({ esClient, query: QUERY });
      const message = result.result === 'found' ? String(result.rows[0].message) : '';

      expect(message).toBe('x'.repeat(499));
      expect(result).toMatchObject({ cells_truncated: true });
    });

    it('cuts the serialized form of an array cell the same way', async () => {
      const esClient = createClient();
      respondWith(esClient, table(['list'], [[['y'.repeat(600)]]]));

      const result = await runEvidence({ esClient, query: QUERY });

      expect(result).toMatchObject({ cells_truncated: true });
      expect(result.result === 'found' && String(result.rows[0].list)).toHaveLength(500);
    });
  });

  describe('column names', () => {
    it('keys a repeated name with the first unused suffix', async () => {
      const esClient = createClient();
      respondWith(esClient, table(['a', 'a'], [[1, 2]]));

      const result = await runEvidence({ esClient, query: QUERY });

      expect(result.result === 'found' && result.rows).toEqual([{ a: 1, a_2: 2 }]);
    });

    it.each([
      ['a, a_2, a', ['a', 'a_2', 'a'], ['a', 'a_2', 'a_3']],
      ['a, a, a_2', ['a', 'a', 'a_2'], ['a', 'a_3', 'a_2']],
    ])('never lets a suffix collide with a real column: %s', async (_title, names, keys) => {
      const esClient = createClient();
      respondWith(esClient, table(names, [[1, 2, 3]]));

      const result = await runEvidence({ esClient, query: QUERY });

      expect(result.result === 'found' && Object.keys(result.rows[0])).toEqual(keys);
      expect(result.result === 'found' && Object.values(result.rows[0])).toEqual([1, 2, 3]);
    });

    it('keeps a column named __proto__ as an ordinary key of the row', async () => {
      const esClient = createClient();
      respondWith(esClient, table(['__proto__', 'x'], [['polluted', 'y']]));

      const result = await runEvidence({ esClient, query: QUERY });
      const row = result.result === 'found' ? result.rows[0] : {};

      expect(Object.keys(row)).toEqual(['__proto__', 'x']);
      expect(Object.getPrototypeOf(row)).toBeNull();
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    });
  });

  describe('empty and malformed responses', () => {
    it('reports no rows as empty', async () => {
      const esClient = createClient();
      respondWith(esClient, table(['message'], []));

      expect(await runEvidence({ esClient, query: QUERY })).toEqual({ result: 'empty' });
    });

    it.each([
      ['columns', { values: [[1]] }],
      ['values', { columns: [{ name: 'n', type: 'long' }] }],
    ])('reports a response with no %s as an error, not a throw', async (_missing, response) => {
      const esClient = createClient();
      respondWith(esClient, response);

      expect(await runEvidence({ esClient, query: QUERY })).toEqual({
        result: 'error',
        reason: 'query_failed',
        message: 'the response has no columns or no values',
      });
    });
  });

  describe('errors', () => {
    it('reports a rejection as query_failed with the client message', async () => {
      const esClient = createClient();
      esClient.esql.query.mockRejectedValue(new Error('verification_exception: unknown index'));

      expect(await runEvidence({ esClient, query: QUERY })).toEqual({
        result: 'error',
        reason: 'query_failed',
        message: 'verification_exception: unknown index',
      });
    });

    it('reports a value that is not an Error', async () => {
      const esClient = createClient();
      esClient.esql.query.mockRejectedValue('shard failure');

      expect(await runEvidence({ esClient, query: QUERY })).toMatchObject({
        reason: 'query_failed',
        message: 'shard failure',
      });
    });

    it('cuts an error message longer than 500 characters', async () => {
      const esClient = createClient();
      esClient.esql.query.mockRejectedValue(new Error('e'.repeat(900)));

      const result = await runEvidence({ esClient, query: QUERY });

      expect(result.result === 'error' && result.message).toHaveLength(500);
    });
  });

  describe('timeout and abort', () => {
    it('reports a query that runs past its timeout, with no caller signal', async () => {
      const esClient = createClient();
      hangUntilAborted(esClient);

      expect(await runEvidence({ esClient, query: QUERY, timeoutMs: 5 })).toEqual({
        result: 'error',
        reason: 'timeout',
        message: 'evidence query exceeded 5 ms',
      });
    });

    it.each([-1, 0, NaN, 1.5, Infinity, 2 ** 31])(
      'does not throw for a timeoutMs of %s, and falls back to the default of 20 s',
      async (timeoutMs) => {
        jest.useFakeTimers();
        try {
          const esClient = createClient();
          hangUntilAborted(esClient);

          const pending = runEvidence({ esClient, query: QUERY, timeoutMs });
          await jest.advanceTimersByTimeAsync(20_000);

          // A value passed through instead of replaced would time out at its own delay.
          expect(await pending).toEqual({
            result: 'error',
            reason: 'timeout',
            message: 'evidence query exceeded 20000 ms',
          });
        } finally {
          jest.useRealTimers();
        }
      }
    );

    it('clears the deadline timer once the query settles', async () => {
      jest.useFakeTimers();
      try {
        const esClient = createClient();
        respondWith(esClient, table(['message'], [['ok']]));

        await runEvidence({ esClient, query: QUERY });

        expect(jest.getTimerCount()).toBe(0);
      } finally {
        jest.useRealTimers();
      }
    });

    it('reports an abort from the caller while the query runs', async () => {
      const esClient = createClient();
      hangUntilAborted(esClient);
      const controller = new AbortController();

      const pending = runEvidence({ esClient, query: QUERY, abortSignal: controller.signal });
      controller.abort();

      expect(await pending).toEqual({
        result: 'error',
        reason: 'aborted',
        message: 'evidence query aborted',
      });
    });

    it('does not call the client when the caller has already aborted', async () => {
      const esClient = createClient();
      const controller = new AbortController();
      controller.abort();

      const result = await runEvidence({ esClient, query: QUERY, abortSignal: controller.signal });

      expect(result).toMatchObject({ result: 'error', reason: 'aborted' });
      expect(esClient.esql.query).not.toHaveBeenCalled();
    });

    it('reports the abort when the caller aborted and the timeout fired too', async () => {
      const esClient = createClient();
      // Rejects only after both have fired, so the reason has to be picked between them.
      esClient.esql.query.mockImplementation((async () => {
        await wait(40);
        throw new Error('socket closed');
      }) as never);
      const controller = new AbortController();

      const pending = runEvidence({
        esClient,
        query: QUERY,
        abortSignal: controller.signal,
        timeoutMs: 5,
      });
      await wait(20);
      controller.abort();

      expect(await pending).toMatchObject({ result: 'error', reason: 'aborted' });
    });

    it('reports an abort-shaped error as query_failed when neither signal fired', async () => {
      const esClient = createClient();
      const tooLarge = new Error('The content length is bigger than the maximum allowed string');
      tooLarge.name = 'RequestAbortedError';
      esClient.esql.query.mockRejectedValue(tooLarge);

      expect(await runEvidence({ esClient, query: QUERY })).toMatchObject({
        reason: 'query_failed',
      });
    });
  });

  describe('the call', () => {
    it('sends the query unchanged, refuses partial results and passes a signal', async () => {
      const esClient = createClient();
      respondWith(esClient, table(['message'], []));

      await runEvidence({ esClient, query: QUERY });

      expect(esClient.esql.query).toHaveBeenCalledWith(
        { query: QUERY, allow_partial_results: false },
        { signal: expect.any(AbortSignal) }
      );
    });
  });
});
