/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { EVIDENCE_MAX_CELL_LENGTH } from './evidence_types';
import { runEvidence } from './run_evidence';

const QUERY = 'FROM logs | WHERE message : "timeout" | LIMIT 100 | KEEP message, count';

type TestClient = ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

interface TestResponse {
  columns?: Array<{ name: string; type: string }>;
  values?: Array<Array<string | number | boolean | null | string[] | { k: number }>>;
  is_partial?: boolean;
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

describe('runEvidence', () => {
  describe('found', () => {
    it('keeps the rows, keyed by column name, with neither flag set', async () => {
      const esClient = createClient();
      respondWith(esClient, table(['message', 'count'], [['timeout calling cart', 3]]));

      expect(await runEvidence({ esClient, query: QUERY })).toEqual({
        result: 'found',
        rows: [{ message: 'timeout calling cart', count: 3 }],
        rows_truncated: false,
        cells_truncated: false,
      });
    });

    it('does not flag exactly 5 rows', async () => {
      const esClient = createClient();
      respondWith(esClient, table(['n'], [[1], [2], [3], [4], [5]]));

      const result = await runEvidence({ esClient, query: QUERY });

      expect(result).toMatchObject({ result: 'found', rows_truncated: false });
      expect(result.result === 'found' && result.rows).toHaveLength(5);
    });

    it('keeps the first 5 rows and flags the rest as left out', async () => {
      const esClient = createClient();
      respondWith(esClient, table(['n'], [[1], [2], [3], [4], [5], [6]]));

      expect(await runEvidence({ esClient, query: QUERY })).toEqual({
        result: 'found',
        rows: [{ n: 1 }, { n: 2 }, { n: 3 }, { n: 4 }, { n: 5 }],
        rows_truncated: true,
        cells_truncated: false,
      });
    });

    it('drops a column whose only value is in the row beyond the kept ones', async () => {
      const esClient = createClient();
      respondWith(
        esClient,
        table(
          ['n', 'late'],
          [
            [1, null],
            [2, null],
            [3, null],
            [4, null],
            [5, null],
            [6, 'only here'],
          ]
        )
      );

      const result = await runEvidence({ esClient, query: QUERY });

      expect(result.result === 'found' && result.rows).toEqual([
        { n: 1 },
        { n: 2 },
        { n: 3 },
        { n: 4 },
        { n: 5 },
      ]);
    });

    it('leaves numbers, booleans and null unchanged', async () => {
      const esClient = createClient();
      // `c` has a value in the second row, so the column is kept and its null is passed through.
      respondWith(
        esClient,
        table(
          ['a', 'b', 'c', 'd'],
          [
            [1.5, true, null, 0],
            [2, false, 'x', 1],
          ]
        )
      );

      const result = await runEvidence({ esClient, query: QUERY });

      expect(result.result === 'found' && result.rows).toEqual([
        { a: 1.5, b: true, c: null, d: 0 },
        { a: 2, b: false, c: 'x', d: 1 },
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
    it('keeps a column named __proto__ as an ordinary key of the row', async () => {
      const esClient = createClient();
      respondWith(esClient, table(['__proto__', 'x'], [['polluted', 'y']]));

      const result = await runEvidence({ esClient, query: QUERY });
      const row = result.result === 'found' ? result.rows[0] : {};

      expect(Object.keys(row)).toEqual(['__proto__', 'x']);
    });
  });

  describe('empty and malformed responses', () => {
    it.each([
      ['no rows', table(['message'], [])],
      // What `drop_null_columns` returns for an aggregate over no matches, such as `STATS m = MAX(x)`.
      ['one row whose every cell was null, so no column is left', table([], [[]])],
    ])('reports %s as empty', async (_title, response) => {
      const esClient = createClient();
      respondWith(esClient, response);

      expect(await runEvidence({ esClient, query: QUERY })).toEqual({ result: 'empty' });
    });

    it.each([
      // Matched documents whose kept fields are all null: only a non-aggregate query returns these.
      ['two rows with no value', table([], [[], []]), 2, false],
      // Elasticsearch keeps `late` for the 6th row; the 5 kept rows hold no value of it.
      [
        'six rows with a value only in the 6th',
        table(['late'], [[null], [null], [null], [null], [null], ['only here']]),
        5,
        true,
      ],
    ])(
      'keeps %s as found with empty rows, not as empty',
      async (_title, response, rowCount, rowsTruncated) => {
        const esClient = createClient();
        respondWith(esClient, response);

        expect(await runEvidence({ esClient, query: QUERY })).toEqual({
          result: 'found',
          rows: Array.from({ length: rowCount }, () => ({})),
          rows_truncated: rowsTruncated,
          cells_truncated: false,
        });
      }
    );

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

    it('reports a partial response as query_failed, never as found', async () => {
      const esClient = createClient();
      respondWith(esClient, { ...table(['n'], [[1]]), is_partial: true });

      expect(await runEvidence({ esClient, query: QUERY })).toEqual({
        result: 'error',
        reason: 'query_failed',
        message: 'the response is partial: a remote cluster or linked project was skipped',
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

    it('reports a query that is not valid ES|QL without calling the client', async () => {
      const esClient = createClient();

      const result = await runEvidence({ esClient, query: 'FROM logs | WHERE ((' });

      expect(result).toMatchObject({ result: 'error', reason: 'query_failed' });
      expect(result.result === 'error' && result.message).toMatch(
        /^the evidence query is not valid ES\|QL: /
      );
      expect(esClient.esql.query).not.toHaveBeenCalled();
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
      jest.useFakeTimers();
      try {
        const esClient = createClient();
        hangUntilAborted(esClient);

        const pending = runEvidence({ esClient, query: QUERY, timeoutMs: 5 });
        await jest.advanceTimersByTimeAsync(5);

        expect(await pending).toEqual({
          result: 'error',
          reason: 'timeout',
          message: 'evidence query exceeded 5 ms',
        });
      } finally {
        jest.useRealTimers();
      }
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
      jest.useFakeTimers();
      try {
        const esClient = createClient();
        // Rejects only after both have fired, so the reason has to be picked between them.
        esClient.esql.query.mockImplementation(
          (() =>
            new Promise((_resolve, reject) => {
              setTimeout(() => reject(new Error('socket closed')), 40);
            })) as never
        );
        const controller = new AbortController();

        const pending = runEvidence({
          esClient,
          query: QUERY,
          abortSignal: controller.signal,
          timeoutMs: 5,
        });
        await jest.advanceTimersByTimeAsync(20);
        controller.abort();
        await jest.advanceTimersByTimeAsync(40);

        expect(await pending).toMatchObject({ result: 'error', reason: 'aborted' });
      } finally {
        jest.useRealTimers();
      }
    });

    it("reports the client's own request timeout as a timeout, not query_failed", async () => {
      const esClient = createClient();
      esClient.esql.query.mockRejectedValue(new errors.TimeoutError('Request timed out'));

      expect(await runEvidence({ esClient, query: QUERY })).toEqual({
        result: 'error',
        reason: 'timeout',
        message: 'Request timed out',
      });
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
    it('limits the query to one row more than is kept, refuses partial results, drops null columns and passes a signal', async () => {
      const esClient = createClient();
      respondWith(esClient, table(['message'], []));

      await runEvidence({ esClient, query: QUERY });

      expect(esClient.esql.query).toHaveBeenCalledWith(
        {
          query: `${QUERY} | LIMIT 6`,
          allow_partial_results: false,
          drop_null_columns: true,
        },
        { signal: expect.any(AbortSignal) }
      );
    });
  });
});
