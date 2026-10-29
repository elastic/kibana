/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryArgs, Row } from '../common';
import { fetchComputedColumnSortPage } from './computed_column';
import type { ComputedColumn } from './computed_column';

const ARGS: QueryArgs = {
  namespace: 'default',
  timeRange: '30d',
  sort: { field: 'count', direction: 'desc' },
  pageSize: 2,
  rowsMode: 'individual',
  concreteEntityIndexName: '.entities.v2.latest.default-00001',
  anomalyJobIds: [],
};

const SEARCH = 'KQL("""entity.name: web*""")';

const row = (id: string, count: number | null = null): Row => ({ 'entity.id': id, count });
const ids = (rows: readonly Row[]) => rows.map((r) => r['entity.id']);

/** A column and a fake runner that answers each engine query and records which ran. */
const setup = ({
  valueRows = [] as Row[],
  entities = [] as Row[],
  matches = [] as Row[],
  emptyValue = 0 as number | null,
}) => {
  const values = new Map(valueRows.map((r) => [r['entity.id'], r]));
  const calls: string[] = [];
  const column: ComputedColumn = {
    emptyValues: { count: emptyValue },
    buildSortWithValueQuery: (_args, limit) => ['FROM source', `| LIMIT ${limit}`],
    buildSortAllQuery: () => ['MERGED'],
    fetchValues: async (rows) => {
      calls.push(`lookup ${rows.length}`);
      return new Map(
        ids(rows).map((id) => [id as string, { count: values.get(id)?.count ?? emptyValue }])
      );
    },
  };
  const runQuery = async (steps: readonly string[]): Promise<Row[]> => {
    const query = steps.join('\n');
    const limit = Number(query.match(/LIMIT (\d+)/)?.[1]);
    if (query === 'MERGED') {
      calls.push('merged');
      return [row('merged')];
    }
    if (query.startsWith('FROM source')) {
      calls.push(`values ${limit}`);
      return valueRows.slice(0, limit);
    }
    if (query.includes('| KEEP `entity.id`')) {
      calls.push('search check');
      return matches.filter((m) => query.includes(`"${m['entity.id']}"`));
    }
    if (query.includes('| SORT entity.id ASC')) {
      const excluded = query.match(/NOT entity\.id IN \(([^)]*)\)/)?.[1] ?? '';
      const after = query.match(/entity\.id > "([^"]+)"/)?.[1];
      calls.push(
        excluded ? `empty excluding ${limit}` : `empty batch${after ? ` after ${after}` : ''}`
      );
      return entities
        .filter((e) => !excluded.includes(`"${e['entity.id']}"`))
        .filter((e) => after == null || String(e['entity.id']) > after)
        .slice(0, limit)
        .map((e) => ({ ...e, count: emptyValue }));
    }
    calls.push(`matches ${limit}`);
    return matches.slice(0, limit);
  };
  return { column, runQuery, calls };
};

describe('fetchComputedColumnSortPage', () => {
  it('reads only the value rows when they fill the rows', async () => {
    const { column, runQuery, calls } = setup({
      valueRows: [row('a', 3), row('b', 2), row('c', 1)],
    });

    const rows = await fetchComputedColumnSortPage(column, ARGS, { runQuery });

    expect(ids(rows)).toEqual(['a', 'b', 'c']);
    expect(calls).toEqual(['values 3']);
  });

  it('adds the empty rows, leaving out the entities with a value, when the value rows are few', async () => {
    const { column, runQuery, calls } = setup({
      valueRows: [row('b', 2)],
      entities: [row('a'), row('b'), row('c')],
    });

    const rows = await fetchComputedColumnSortPage(column, ARGS, { runQuery });

    expect(ids(rows)).toEqual(['b', 'a', 'c']);
    expect(calls).toEqual(['values 3', 'empty excluding 3']);
  });

  it('puts the empty rows first ascending, and keeps null empty rows last', async () => {
    const asc = { ...ARGS, sort: { field: 'count', direction: 'asc' as const } };
    const zero = setup({ valueRows: [row('b', 2)], entities: [row('a'), row('b'), row('c')] });
    const nulls = setup({
      valueRows: [row('b', 2)],
      entities: [row('a'), row('b'), row('c')],
      emptyValue: null,
    });

    expect(ids(await fetchComputedColumnSortPage(zero.column, asc, zero))).toEqual(['a', 'c', 'b']);
    expect(ids(await fetchComputedColumnSortPage(nulls.column, asc, nulls))).toEqual([
      'b',
      'a',
      'c',
    ]);
  });

  it('finds the empty rows in batches when the value rows fill the rows and sort last', async () => {
    const { column, runQuery, calls } = setup({
      // Sorted ascending, as the value rows query returns them.
      valueRows: [row('e', 1), row('c', 2), row('a', 3)],
      entities: [row('a'), row('b'), row('c'), row('d'), row('e')],
    });

    const rows = await fetchComputedColumnSortPage(
      column,
      { ...ARGS, sort: { field: 'count', direction: 'asc' } },
      { runQuery }
    );

    expect(ids(rows)).toEqual(['b', 'd', 'e']);
    expect(calls).toEqual(['values 3', 'empty batch', 'lookup 5']);
  });

  it('looks up the values of the matches of a narrow search and sorts them', async () => {
    const { column, runQuery, calls } = setup({
      valueRows: [row('b', 2), row('z', 9)],
      matches: [row('a'), row('b')],
    });

    const rows = await fetchComputedColumnSortPage(
      column,
      { ...ARGS, searchExpression: SEARCH },
      { runQuery }
    );

    expect(ids(rows)).toEqual(['b', 'a']);
    expect(calls).toEqual(['matches 10000', 'lookup 2']);
  });

  it('reads every value row for a broad search, keeping those the search matches', async () => {
    const broadMatches = Array.from({ length: 10_000 }, (_, i) => row(`m${i}`));
    const { column, runQuery, calls } = setup({
      valueRows: [row('m1', 5), row('x', 9)],
      entities: [row('m0'), row('m1'), row('m2')],
      matches: broadMatches,
    });

    const rows = await fetchComputedColumnSortPage(
      column,
      { ...ARGS, searchExpression: SEARCH },
      { runQuery }
    );

    expect(ids(rows)).toEqual(['m1', 'm0', 'm2']);
    expect(calls.slice(0, 2)).toEqual(['matches 10000', 'values 10000']);
    // The search check and the empty rows run at once, in either order.
    expect([...calls.slice(2)].sort()).toEqual(['empty excluding 3', 'search check']);
  });

  it('runs the merged query when the search and the value rows are both too many', async () => {
    const many = Array.from({ length: 10_000 }, (_, i) => row(`m${i}`, 1));
    const { column, runQuery, calls } = setup({ valueRows: many, matches: many });

    const rows = await fetchComputedColumnSortPage(
      column,
      { ...ARGS, searchExpression: SEARCH },
      { runQuery }
    );

    expect(ids(rows)).toEqual(['merged']);
    expect(calls).toEqual(['matches 10000', 'values 10000', 'merged']);
  });
});
