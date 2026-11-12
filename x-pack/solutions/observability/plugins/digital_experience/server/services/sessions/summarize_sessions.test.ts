/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { SESSIONS_INDEX } from '../../../common/sessions';
import {
  IDS_PER_QUERY,
  INITIAL_WINDOW_MS,
  MAX_SESSIONS_PER_WINDOW,
  MAX_WINDOW_MS,
  MIN_WINDOW_MS,
  ROWS_PER_TICK,
  SESSIONS_PER_QUERY,
  lookbackStart,
  summarizeSessions,
} from './summarize_sessions';
import { toSessionDocuments } from './summary_documents';

const { toSessionDocuments: buildDocuments } = jest.requireActual('./summary_documents');
jest.mock('./summary_documents', () => {
  const actual = jest.requireActual('./summary_documents');
  return { ...actual, toSessionDocuments: jest.fn(actual.toSessionDocuments) };
});

const NOW = Date.parse('2026-11-11T12:00:00.000Z');
const UNTIL = NOW - 60_000;
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

const result = (columns: string[], values: unknown[][]): estypes.EsqlEsqlResult => ({
  columns: columns.map((name) => ({ name, type: 'keyword' })),
  values: values as estypes.FieldValue[][],
});

const summaryRow = (session: string) => [
  'app',
  session,
  '2026-11-11T11:50:00.000Z',
  '2026-11-11T11:55:00.000Z',
  3,
];
const SUMMARY_COLUMNS = ['service', 'session', 'start_time', 'end_time', 'page_view_count'];

/**
 * Answers the count query with `changed(window)`, the ids query with `ids(params)` and the summary
 * query with `summaryRows(query)`, once `beforeSummary` resolves.
 */
const setUp = ({
  changed = () => 2,
  ids = () => ['a', 'b'],
  summaryRows = () => [summaryRow('a'), summaryRow('b')],
  beforeSummary = async () => {},
}: {
  changed?: (params: estypes.EsqlNamedValue[]) => number;
  ids?: (params: estypes.EsqlNamedValue[]) => string[];
  summaryRows?: (query: string) => unknown[][];
  beforeSummary?: () => Promise<void>;
} = {}) => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  esClient.esql.query.mockImplementation((async ({ query, params = [] }) => {
    const named = params as estypes.EsqlNamedValue[];
    if (query.includes('COUNT_DISTINCT')) {
      return result(['sessions'], [[changed(named)]]);
    }
    if (query.includes('VALUES(session_id)')) {
      // One bucket row; ES|QL returns a single id as is and several as an array.
      const bucketIds = ids(named);
      return result(
        ['session_ids', 'bucket'],
        [[bucketIds.length === 1 ? bucketIds[0] : bucketIds, '000']]
      );
    }
    await beforeSummary();
    return result(SUMMARY_COLUMNS, summaryRows(query));
  }) as typeof esClient.esql.query);
  esClient.bulk.mockResolvedValue({ errors: false, items: [], took: 1 });
  return esClient;
};

const paramOf = (params: estypes.EsqlNamedValue[], name: string) =>
  params.find((param) => name in param)?.[name];

const run = (esClient: ReturnType<typeof setUp>, overrides = {}) =>
  summarizeSessions({
    esClient,
    signal: new AbortController().signal,
    now: NOW,
    checkpoint: new Date(UNTIL - 2 * MINUTE).toISOString(),
    windowMs: INITIAL_WINDOW_MS,
    budgetMs: 45_000,
    concurrency: 2,
    ...overrides,
  });

describe('summarizeSessions', () => {
  it('summarizes the changed sessions up to the sync delay and writes them by session', async () => {
    const esClient = setUp();

    const progress = await run(esClient);

    expect(progress).toEqual({
      checkpoint: new Date(UNTIL).toISOString(),
      windowMs: 2 * INITIAL_WINDOW_MS,
      caughtUp: true,
      sessions: 2,
    });
    const [{ operations }] = esClient.bulk.mock.calls[0];
    expect(operations).toHaveLength(4);
    expect(operations?.[0]).toEqual({ index: { _index: SESSIONS_INDEX, _id: expect.any(String) } });
    expect(operations?.[1]).toMatchObject({ session: { id: 'a' }, service: { name: 'app' } });
  });

  it('rebuilds the changed sessions from up to a day before the window', async () => {
    const esClient = setUp();

    await run(esClient);

    const summaryCall = esClient.esql.query.mock.calls.find(([{ query }]) =>
      query.includes('page_view_count = COUNT')
    );
    const params = summaryCall?.[0].params as estypes.EsqlNamedValue[];
    expect(summaryCall?.[0].query).toContain('attributes.session.id IN ("a", "b")');
    expect(paramOf(params, 'changed_to')).toBe(new Date(UNTIL).toISOString());
    expect(paramOf(params, 'rebuild_from')).toBe(
      new Date(UNTIL - 2 * MINUTE - 24 * HOUR).toISOString()
    );
  });

  it('starts from the lookback without a checkpoint, and stops at the time budget', async () => {
    const esClient = setUp({ changed: () => 0 });

    const progress = await run(esClient, { checkpoint: null, budgetMs: 0 });

    // The budget is checked before each window, so none starts.
    expect(progress.checkpoint).toBe(new Date(lookbackStart(NOW)).toISOString());
    expect(progress.caughtUp).toBe(false);
    expect(esClient.esql.query).not.toHaveBeenCalled();
  });

  it('never reads before the lookback, even from an older checkpoint', async () => {
    const esClient = setUp({ changed: () => 0 });

    await run(esClient, { checkpoint: '2020-01-01T00:00:00.000Z', windowMs: MAX_WINDOW_MS });

    const [{ params }] = esClient.esql.query.mock.calls[0];
    expect(paramOf(params as estypes.EsqlNamedValue[], 'changed_from')).toBe(
      new Date(lookbackStart(NOW)).toISOString()
    );
  });

  it('halves a window with too many sessions before summarizing it', async () => {
    const esClient = setUp({
      changed: (params) => {
        const from = Date.parse(String(paramOf(params, 'changed_from')));
        const to = Date.parse(String(paramOf(params, 'changed_to')));
        return to - from > 30 * MINUTE ? MAX_SESSIONS_PER_WINDOW + 1 : 2;
      },
    });

    const progress = await run(esClient, { checkpoint: new Date(UNTIL - HOUR).toISOString() });

    expect(progress.caughtUp).toBe(true);
    const windows = esClient.esql.query.mock.calls
      .map(([{ query, params }]) => ({ query, params: params as estypes.EsqlNamedValue[] }))
      .filter(({ query }) => query.includes('COUNT_DISTINCT'))
      .map(({ params }) => [paramOf(params, 'changed_from'), paramOf(params, 'changed_to')]);
    expect(windows[0]).toEqual([
      new Date(UNTIL - HOUR).toISOString(),
      new Date(UNTIL).toISOString(),
    ]);
    expect(windows[1]).toEqual([
      new Date(UNTIL - HOUR).toISOString(),
      new Date(UNTIL - 30 * MINUTE).toISOString(),
    ]);
  });

  it('fetches the changed ids in a query per IDS_PER_QUERY sessions', async () => {
    const esClient = setUp({
      changed: () => 2 * IDS_PER_QUERY + 1,
      // A single id per hash range, named after where the range starts.
      ids: (params) => [`from-${paramOf(params, 'hash_from') ?? 'start'}`],
    });

    await run(esClient);

    const queries = esClient.esql.query.mock.calls.map(([{ query }]) => query);
    expect(queries.filter((query) => query.includes('VALUES(session_id)'))).toHaveLength(3);
    expect(queries.find((query) => query.includes('page_view_count = COUNT'))).toContain(
      'IN ("from-start", "from-55555555", "from-aaaaaaaa")'
    );
  });

  it('splits a batch whose summaries fill an ES|QL response', async () => {
    const esClient = setUp({
      summaryRows: (query) =>
        query.includes('IN ("a", "b")')
          ? Array.from({ length: 10_000 }, (_, index) => summaryRow(`s${index}`))
          : [summaryRow('one')],
    });

    const progress = await run(esClient);

    expect(progress.sessions).toBe(2);
    const batches = esClient.esql.query.mock.calls
      .map(([{ query }]) => query)
      .filter((query) => query.includes('page_view_count = COUNT'))
      .map((query) => query.match(/IN \(([^)]*)\)/)?.[1]);
    expect(batches).toEqual(['"a", "b"', '"a"', '"b"']);
  });

  it('builds the summaries of a large response a chunk per event loop turn', async () => {
    const rows = 2 * ROWS_PER_TICK + 1;
    const esClient = setUp({
      summaryRows: () => Array.from({ length: rows }, (_, index) => summaryRow(`s${index}`)),
    });
    // Each chunk queues work for the next event loop turn; it runs before the next chunk only if
    // the run yields in between (mocked queries resolve without a turn).
    const events: string[] = [];
    jest.mocked(toSessionDocuments).mockImplementation((chunkRows) => {
      events.push(`chunk of ${chunkRows.length}`);
      setImmediate(() => events.push('other work'));
      return buildDocuments(chunkRows);
    });

    const progress = await run(esClient).finally(() => {
      jest.mocked(toSessionDocuments).mockImplementation(buildDocuments);
    });

    expect(progress.sessions).toBe(rows);
    expect(events.slice(0, 5)).toEqual([
      `chunk of ${ROWS_PER_TICK}`,
      'other work',
      `chunk of ${ROWS_PER_TICK}`,
      'other work',
      'chunk of 1',
    ]);
    const [{ operations }] = esClient.bulk.mock.calls[0];
    expect(operations).toHaveLength(2 * rows);
    expect(operations?.[1]).toMatchObject({ session: { id: 's0' } });
    expect(operations?.[2 * rows - 1]).toMatchObject({ session: { id: `s${rows - 1}` } });
  });

  it.each([1, 2, 3])(
    'runs up to %s summary queries at once, and writes every batch',
    async (concurrency) => {
      const batches = 4;
      let inFlight = 0;
      let mostInFlight = 0;
      const esClient = setUp({
        changed: () => batches * SESSIONS_PER_QUERY,
        ids: () => Array.from({ length: batches * SESSIONS_PER_QUERY }, (_, index) => `s${index}`),
        summaryRows: () => [summaryRow('one')],
        // Holds each summary query for a turn of the event loop, counting those in flight.
        beforeSummary: async () => {
          inFlight++;
          mostInFlight = Math.max(mostInFlight, inFlight);
          await new Promise((resolve) => setImmediate(resolve));
          inFlight--;
        },
      });

      const progress = await run(esClient, { concurrency });

      expect(mostInFlight).toBe(concurrency);
      expect(progress.sessions).toBe(batches);
      expect(esClient.bulk).toHaveBeenCalledTimes(batches);
    }
  );

  it('fails the window when one of the batches running at once fails', async () => {
    const esClient = setUp({
      changed: () => 2 * SESSIONS_PER_QUERY,
      ids: () => Array.from({ length: 2 * SESSIONS_PER_QUERY }, (_, index) => `s${index}`),
    });
    esClient.bulk
      .mockResolvedValueOnce({ errors: false, items: [], took: 1 })
      .mockRejectedValueOnce(new Error('bulk failed'));

    await expect(run(esClient, { concurrency: 2 })).rejects.toThrow('bulk failed');
  });

  it('keeps the checkpoint before a window that fails to write', async () => {
    const esClient = setUp();
    esClient.bulk.mockResolvedValue({
      errors: true,
      took: 1,
      items: [{ index: { status: 403, error: { type: 'security_exception', reason: 'denied' } } }],
    } as estypes.BulkResponse);

    await expect(run(esClient)).rejects.toThrow(
      'Writing session summaries failed: security_exception: denied'
    );
  });

  it('keeps windows between a minute and a day', async () => {
    const esClient = setUp({ changed: () => 0 });

    const progress = await run(esClient, { windowMs: 1 });

    expect(progress.windowMs).toBeGreaterThanOrEqual(MIN_WINDOW_MS);
    expect(progress.windowMs).toBeLessThanOrEqual(MAX_WINDOW_MS);
  });
});
