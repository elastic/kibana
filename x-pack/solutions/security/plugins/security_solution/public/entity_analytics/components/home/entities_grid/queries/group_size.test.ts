/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryArgs, Row } from '../common';
import { groupSizeQuerySpec } from './group_size';
import { SPLIT_SORT_MIN_VIEW_SIZE } from './split_sort';

const LARGE_VIEW = SPLIT_SORT_MIN_VIEW_SIZE;

const baseArgs: QueryArgs = {
  namespace: 'default',
  timeRange: '30d',
  sort: { field: 'group_size', direction: 'desc' },
  cursor: null,
  pageSize: 2,
  rowsMode: 'resolved',
  concreteEntityIndexName: '.entities.v2.latest.default-00001',
  anomalyJobIds: ['security_auth_rare_user'],
};

const SEARCH = 'KQL("""entity.name: x""")';

const group = (id: string, size: number): Row => ({ 'entity.id': id, group_size: size });
const single = (id: string): Row => ({ 'entity.id': id, group_size: 1, 'entity.name': id });

interface SearchFixtures {
  /** Targets that the search matches. */
  targets?: Row[];
  /** Full group sizes by target. */
  sizes?: Row[];
  /** Targets of the groups with aliases that the search matches. */
  searched?: Row[];
}

/** Answers each query kind from fixtures and records which kinds ran. */
const fakeRunner = (
  groups: Row[],
  singles: Row[],
  { targets = [], sizes = [], searched = [] }: SearchFixtures = {}
) => {
  const kinds: string[] = [];
  const runQuery = async (query: string): Promise<Row[]> => {
    if (query.includes('alias_count')) {
      kinds.push('groups');
      return groups;
    }
    if (query.includes('STATS group_size = COUNT(*) BY group_key')) {
      kinds.push('sizes');
      return sizes;
    }
    if (query.includes('KEEP `entity.id`') && query.includes('entity.id IN (')) {
      kinds.push('searched');
      return searched;
    }
    if (query.includes('KEEP `entity.id`')) {
      kinds.push('targets');
      return targets;
    }
    if (query.includes('TO_LONG(1)')) {
      kinds.push('singles');
      const after = query.match(/entity\.id > "([^"]+)"/)?.[1];
      const limit = Number(query.match(/LIMIT (\d+)/)?.[1]);
      return singles.filter((r) => after == null || String(r['entity.id']) > after).slice(0, limit);
    }
    if (query.includes('entity.id IN (')) {
      kinds.push('docs');
      return [...groups, ...targets].map((g) => ({
        'entity.id': g['entity.id'],
        'entity.name': `${g['entity.id']} name`,
      }));
    }
    kinds.push('general');
    return [];
  };
  return { runQuery, kinds };
};

const runPage = (args: QueryArgs, runQuery: (q: string) => Promise<Row[]>, viewSize = LARGE_VIEW) =>
  groupSizeQuerySpec.fetchSortPage(args, { runQuery, fetchViewSize: async () => viewSize });

const ids = (rows: Row[]) => rows.map((r) => r['entity.id']);

describe('group size sort page', () => {
  it('runs the single query for small views without a search', async () => {
    const { runQuery, kinds } = fakeRunner([], []);
    await runPage(baseArgs, runQuery, 10);
    expect(kinds).toEqual(['general']);
  });

  it('reads the targets a search matches with the size of their whole groups', async () => {
    const { runQuery, kinds } = fakeRunner([], [], {
      targets: [{ 'entity.id': 'a' }, { 'entity.id': 't' }],
      sizes: [
        { 'entity.id': 't', group_size: 3 },
        { 'entity.id': 'a', group_size: 1 },
      ],
    });
    // A small view: the single search query would group every entity in the store.
    const rows = await runPage({ ...baseArgs, searchExpression: SEARCH }, runQuery, 1);
    expect(rows).toEqual([
      { 'entity.id': 't', 'entity.name': 't name', group_size: 3 },
      { 'entity.id': 'a', 'entity.name': 'a name', group_size: 1 },
    ]);
    expect(kinds).toEqual(['targets', 'sizes', 'docs']);
  });

  it('keeps the groups with aliases whose target a broad search matches', async () => {
    const { runQuery, kinds } = fakeRunner([group('t', 3), group('u', 2)], [single('a')], {
      targets: Array.from({ length: 10_001 }, (_, i) => ({ 'entity.id': `e${i}` })),
      searched: [{ 'entity.id': 'u' }],
    });
    const rows = await runPage({ ...baseArgs, searchExpression: SEARCH }, runQuery);
    expect(ids(rows)).toEqual(['u', 'a']);
    expect(kinds).toEqual(['targets', 'groups', 'searched', 'singles', 'docs']);
  });

  it('reads only the groups with aliases when they fill the page, descending', async () => {
    const { runQuery, kinds } = fakeRunner([group('b', 3), group('a', 3), group('c', 2)], []);
    const rows = await runPage(baseArgs, runQuery);
    expect(ids(rows)).toEqual(['a', 'b', 'c']);
    expect(kinds).toEqual(['groups', 'docs']);
  });

  it('adds single entities after the groups, without the targets of the groups', async () => {
    const { runQuery, kinds } = fakeRunner(
      [group('t', 2)],
      [single('a'), single('t'), single('b')]
    );
    const rows = await runPage(baseArgs, runQuery);
    expect(ids(rows)).toEqual(['t', 'a', 'b']);
    expect(rows[0]).toEqual({ 'entity.id': 't', 'entity.name': 't name', group_size: 2 });
    expect(kinds).toEqual(['groups', 'singles', 'docs']);
  });

  it('puts single entities first ascending, then the groups', async () => {
    const { runQuery } = fakeRunner([group('t', 2)], [single('a'), single('t')]);
    const rows = await runPage(
      { ...baseArgs, sort: { field: 'group_size', direction: 'asc' } },
      runQuery
    );
    expect(ids(rows)).toEqual(['a', 't']);
  });

  it('continues single entities after a cursor among them', async () => {
    const { runQuery } = fakeRunner([], [single('a'), single('b'), single('c'), single('d')]);
    const cursor = {
      sortField: 'group_size',
      sortDirection: 'asc' as const,
      sortValue: 1,
      entityId: 'b',
    };
    const rows = await runPage(
      { ...baseArgs, sort: { field: 'group_size', direction: 'asc' }, cursor },
      runQuery
    );
    expect(ids(rows)).toEqual(['c', 'd']);
  });

  it('skips single entities ascending once the cursor is past them', async () => {
    const { runQuery, kinds } = fakeRunner([group('t', 2), group('u', 3)], [single('a')]);
    const cursor = {
      sortField: 'group_size',
      sortDirection: 'asc' as const,
      sortValue: 2,
      entityId: 't',
    };
    const rows = await runPage(
      { ...baseArgs, sort: { field: 'group_size', direction: 'asc' }, cursor },
      runQuery
    );
    expect(ids(rows)).toEqual(['u']);
    expect(kinds).not.toContain('singles');
  });

  it('runs the single query when there are too many groups with aliases', async () => {
    const groups = Array.from({ length: 10_001 }, (_, i) => group(`g${i}`, 2));
    const { runQuery, kinds } = fakeRunner(groups, []);
    await runPage(baseArgs, runQuery);
    expect(kinds).toEqual(['groups', 'general']);
  });

  it('keeps the search in the single query when a broad search meets too many groups', async () => {
    const groups = Array.from({ length: 10_001 }, (_, i) => group(`g${i}`, 2));
    const targets = Array.from({ length: 10_001 }, (_, i) => ({ 'entity.id': `t${i}` }));
    const { runQuery } = fakeRunner(groups, [], { targets });
    const queries: string[] = [];
    await runPage({ ...baseArgs, searchExpression: SEARCH }, async (query) => {
      queries.push(query);
      return runQuery(query);
    });
    expect(queries[queries.length - 1]).toContain(SEARCH);
  });
});
