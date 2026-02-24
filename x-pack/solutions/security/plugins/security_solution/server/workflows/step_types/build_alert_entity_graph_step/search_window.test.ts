/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { searchWindow } from './search_window';
import type { EsHit, EsSearchClient } from './types';

const makeHit = (id: string, ts: string): EsHit => ({
  _id: id,
  _index: 'alerts',
  _source: { '@timestamp': ts } as EsHit['_source'],
  sort: [ts, id],
});

const makeClient = (pages: EsHit[][]): EsSearchClient => {
  let callIndex = 0;
  const searchImpl: EsSearchClient['search'] = async <TSource>() => {
    const hits = (pages[callIndex] ?? []) as Array<EsHit<TSource>>;
    callIndex++;
    return { hits: { hits } };
  };
  return {
    search: jest.fn(searchImpl) as unknown as EsSearchClient['search'],
  };
};

describe('searchWindow', () => {
  it('invokes onHit for each hit', async () => {
    const hits = [
      makeHit('a', '2026-01-01T00:00:00.000Z'),
      makeHit('b', '2026-01-01T00:01:00.000Z'),
    ];
    const client = makeClient([hits]);
    const collected: string[] = [];

    await searchWindow({
      esClient: client,
      index: 'alerts',
      gteMs: 0,
      lteMs: Date.now(),
      shouldClauses: [{ terms: { 'host.name': ['h1'] } }],
      sourceFields: ['@timestamp'],
      pageSize: 10,
      onHit: (hit) => collected.push(hit._id ?? ''),
      stop: () => false,
      queriesRef: { queries: 0 },
    });

    expect(collected).toEqual(['a', 'b']);
  });

  it('paginates using search_after', async () => {
    const page1 = [makeHit('a', '2026-01-01T00:00:00.000Z')];
    const page2 = [makeHit('b', '2026-01-01T00:01:00.000Z')];
    const client = makeClient([page1, page2, []]);
    const collected: string[] = [];

    await searchWindow({
      esClient: client,
      index: 'alerts',
      gteMs: 0,
      lteMs: Date.now(),
      shouldClauses: [{ terms: { 'host.name': ['h1'] } }],
      sourceFields: ['@timestamp'],
      pageSize: 1,
      onHit: (hit) => collected.push(hit._id ?? ''),
      stop: () => false,
      queriesRef: { queries: 0 },
    });

    expect(collected).toEqual(['a', 'b']);
    expect(client.search).toHaveBeenCalledTimes(3);
  });

  it('stops when stop() returns true', async () => {
    const hits = [
      makeHit('a', '2026-01-01T00:00:00.000Z'),
      makeHit('b', '2026-01-01T00:01:00.000Z'),
    ];
    const client = makeClient([hits]);
    const collected: string[] = [];
    let count = 0;

    await searchWindow({
      esClient: client,
      index: 'alerts',
      gteMs: 0,
      lteMs: Date.now(),
      shouldClauses: [{ terms: { 'host.name': ['h1'] } }],
      sourceFields: ['@timestamp'],
      pageSize: 10,
      onHit: (hit) => {
        collected.push(hit._id ?? '');
        count++;
      },
      stop: () => count >= 1,
      queriesRef: { queries: 0 },
    });

    expect(collected).toEqual(['a']);
  });

  it('stops when an empty page is returned', async () => {
    const client = makeClient([[]]);
    const collected: string[] = [];

    await searchWindow({
      esClient: client,
      index: 'alerts',
      gteMs: 0,
      lteMs: Date.now(),
      shouldClauses: [{ terms: { 'host.name': ['h1'] } }],
      sourceFields: ['@timestamp'],
      pageSize: 10,
      onHit: (hit) => collected.push(hit._id ?? ''),
      stop: () => false,
      queriesRef: { queries: 0 },
    });

    expect(collected).toEqual([]);
    expect(client.search).toHaveBeenCalledTimes(1);
  });

  it('increments the queries counter', async () => {
    const client = makeClient([[makeHit('a', '2026-01-01T00:00:00.000Z')], []]);
    const queriesRef = { queries: 5 };

    await searchWindow({
      esClient: client,
      index: 'alerts',
      gteMs: 0,
      lteMs: Date.now(),
      shouldClauses: [{ terms: { 'host.name': ['h1'] } }],
      sourceFields: ['@timestamp'],
      pageSize: 10,
      onHit: () => {},
      stop: () => false,
      queriesRef,
    });

    expect(queriesRef.queries).toBe(7); // 5 + 2 queries
  });
});
