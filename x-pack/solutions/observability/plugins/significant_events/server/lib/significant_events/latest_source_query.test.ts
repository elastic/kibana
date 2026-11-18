/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import type { ElasticsearchClient } from '@kbn/core/server';
import {
  applyLifetimeOverlap,
  resolveTimeBound,
  runFindSkippedDetectionIds,
  runGetProcessedMarkers,
} from './latest_source_query';

describe('resolveTimeBound', () => {
  it('resolves date-math expressions to ISO', () => {
    const iso = resolveTimeBound('now-7d');
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('rounds date-math expressions up when requested', () => {
    const start = resolveTimeBound('now/d');
    const end = resolveTimeBound('now/d', { roundUp: true });
    expect(new Date(end).getTime()).toBeGreaterThan(new Date(start).getTime());
  });

  it('passes full ISO timestamps through verbatim', () => {
    expect(resolveTimeBound('2026-07-23T10:00:00.000Z')).toBe('2026-07-23T10:00:00.000Z');
  });

  it('passes date-only strings through verbatim so Elasticsearch parses them as UTC', () => {
    expect(resolveTimeBound('2026-07-23')).toBe('2026-07-23');
    expect(resolveTimeBound('2026-07-23', { roundUp: true })).toBe('2026-07-23');
  });

  it('resolves anchored date-math (||) expressions to a rounded-up day end', () => {
    const start = resolveTimeBound('2026-07-23||/d');
    const end = resolveTimeBound('2026-07-23||/d', { roundUp: true });
    expect(new Date(end).getTime() - new Date(start).getTime()).toBe(24 * 60 * 60 * 1000 - 1);
  });
});

describe('applyLifetimeOverlap', () => {
  const activeWhere = esql.exp`${esql.col('status')} IN (${[esql.str('open')]})`;

  const printOverlap = (range: { from?: string; to?: string }) =>
    applyLifetimeOverlap({ query: esql.from('events'), activeWhere, ...range }).toRequest();

  it('keeps entities created by `to` and still active or updated since `from`', () => {
    const { query, params } = printOverlap({
      from: '2026-01-02T00:00:00.000Z',
      to: '2026-01-02T23:59:59.999Z',
    });

    expect(query).toBe(
      'FROM events | WHERE created_at <= TO_DATETIME(?overlapToIso) | WHERE (status IN ("open")) OR @timestamp >= TO_DATETIME(?overlapFromIso)'
    );
    expect(params).toEqual([
      { overlapToIso: '2026-01-02T23:59:59.999Z' },
      { overlapFromIso: '2026-01-02T00:00:00.000Z' },
    ]);
  });

  it('only bounds creation when `from` is omitted', () => {
    const { query } = printOverlap({ to: '2026-01-02T23:59:59.999Z' });

    expect(query).toBe('FROM events | WHERE created_at <= TO_DATETIME(?overlapToIso)');
  });

  it('only bounds the last update when `to` is omitted', () => {
    const { query } = printOverlap({ from: '2026-01-02T00:00:00.000Z' });

    expect(query).toBe(
      'FROM events | WHERE (status IN ("open")) OR @timestamp >= TO_DATETIME(?overlapFromIso)'
    );
  });

  it('leaves the query unchanged without a time range', () => {
    expect(printOverlap({}).query).toBe('FROM events');
  });

  it('rounds date-math `to` up and `from` down', () => {
    const { params } = printOverlap({ from: '2026-01-02||/d', to: '2026-01-02||/d' });

    expect(params).toEqual([
      { overlapToIso: resolveTimeBound('2026-01-02||/d', { roundUp: true }) },
      { overlapFromIso: resolveTimeBound('2026-01-02||/d') },
    ]);
  });
});

const esqlRows = (columns: string[], values: unknown[][]) => ({
  columns: columns.map((name) => ({ name, type: 'keyword' })),
  values,
});

const clientReturning = (rows: ReturnType<typeof esqlRows>) => {
  const query = jest.fn(async (_request: { query: string }) => rows);
  return { query, esClient: { esql: { query } } as unknown as ElasticsearchClient };
};

describe('runGetProcessedMarkers', () => {
  const read = (esClient: ElasticsearchClient, idValues: string[], chunkSize?: number) =>
    runGetProcessedMarkers({
      esClient,
      space: 'default',
      index: 'idx',
      idField: 'detection_id',
      idValues,
      chunkSize,
    });

  it('reads one latest marker per id, so a chunk is bounded by its size', async () => {
    const { query, esClient } = clientReturning(
      esqlRows(['detection_id', '@timestamp', '_source'], [])
    );

    await read(esClient, ['a', 'b', 'c'], 2);

    expect(query).toHaveBeenCalledTimes(2);
    const [first, second] = query.mock.calls.map(([request]) => request.query);
    expect(first).toContain('INLINE STATS latest_ts = MAX(@timestamp) BY detection_id');
    expect(first).toContain('_id == tiebreaker_id');
    expect(first).toContain('LIMIT 2');
    expect(second).toContain('LIMIT 1');
  });

  it('keeps an unknown probe status or baseline out of the skip, not the whole skip', async () => {
    const { esClient } = clientReturning(
      esqlRows(
        ['detection_id', '@timestamp', '_source'],
        [
          [
            'a',
            '2026-01-02T00:00:00.000Z',
            {
              processed_by: 'exec-1',
              skip: {
                reason: 'still_breaching',
                event_id: 'event-1',
                probe_status: 'renamed_status',
                baseline: { decision: 'renamed_decision', value: 1, samples: 2 },
              },
            },
          ],
          ['b', '2026-01-02T00:00:00.000Z', { processed_by: 'exec-1', skip: { reason: 42 } }],
        ]
      )
    );

    const markers = await read(esClient, ['a', 'b']);

    expect(markers.get('a')).toEqual({
      processedAt: '2026-01-02T00:00:00.000Z',
      skip: { reason: 'still_breaching', event_id: 'event-1' },
    });
    expect(markers.get('b')).toEqual({ processedAt: '2026-01-02T00:00:00.000Z' });
  });
});

describe('runFindSkippedDetectionIds', () => {
  const find = (esClient: ElasticsearchClient, limit: number) =>
    runFindSkippedDetectionIds({
      esClient,
      space: 'default',
      index: 'idx',
      idField: 'detection_id',
      eventId: 'event-1',
      limit,
    });

  it('finds the detections by the event their skip names, newest first', async () => {
    const { query, esClient } = clientReturning(esqlRows(['detection_id'], [['d-2'], ['d-1']]));

    expect(await find(esClient, 5)).toEqual({ ids: ['d-2', 'd-1'], truncated: false });
    const [[{ query: text }]] = query.mock.calls;
    expect(text).toContain('`skip.event_id` == "event-1"');
    expect(text).toContain('STATS skipped_at = MAX(@timestamp) BY detection_id');
    expect(text).toContain('SORT skipped_at DESC');
    expect(text).toContain('LIMIT 6');
  });

  it('says when there are more than the limit', async () => {
    const { esClient } = clientReturning(esqlRows(['detection_id'], [['d-3'], ['d-2'], ['d-1']]));

    expect(await find(esClient, 2)).toEqual({ ids: ['d-3', 'd-2'], truncated: true });
  });
});
