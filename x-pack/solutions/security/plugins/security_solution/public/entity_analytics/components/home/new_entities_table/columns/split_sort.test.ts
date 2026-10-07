/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryArgs, Row } from '../common';
import {
  SPLIT_SORT_MIN_VIEW_SIZE,
  buildEmptyRowsQuery,
  buildValueCursorClause,
  runSplitSortPage,
  shouldSplitSort,
} from './split_sort';
import type { SplitSortPlan } from './split_sort';

const LARGE_VIEW = SPLIT_SORT_MIN_VIEW_SIZE;

const baseArgs: QueryArgs = {
  namespace: 'default',
  timeRange: '30d',
  sort: { field: 'alert_count', direction: 'desc' },
  cursor: null,
  pageSize: 2,
  rowsMode: 'resolved',
  concreteEntityIndexName: '.entities.v2.latest.default-00001',
  anomalyJobIds: ['security_auth_rare_user'],
};

const row = (id: string, value: number | null): Row => ({ 'entity.id': id, alert_count: value });

/** A plan whose queries are markers, so the test can see which ones ran. */
const fakePlan = (
  emptyValue: 0 | null,
  valueRows: Row[],
  emptyRows: Row[] | null
): { plan: SplitSortPlan; calls: string[] } => {
  const calls: string[] = [];
  const plan: SplitSortPlan = {
    sortField: 'alert_count',
    emptyValue,
    buildValueRowsQuery: (args, limit) =>
      `values cursor=${args.cursor?.entityId ?? '-'} limit=${limit}`,
    runEmptyRows: async (_args, _runQuery, afterId, limit) => {
      calls.push(`empty after=${afterId ?? '-'} limit=${limit}`);
      return emptyRows == null ? null : emptyRows.slice(0, limit);
    },
    buildSortQuery: () => 'general',
  };
  return { plan, calls };
};

const runner = (calls: string[], valueRows: Row[]) => async (query: string) => {
  calls.push(query);
  if (query === 'general') return [row('general', 1)];
  const limit = Number(query.match(/limit=(\d+)/)?.[1]);
  return valueRows.slice(0, limit);
};

describe('shouldSplitSort', () => {
  it('splits large views without search', () => {
    expect(shouldSplitSort(baseArgs, LARGE_VIEW)).toBe(true);
  });

  it('keeps the general query for small views and for search', () => {
    expect(shouldSplitSort(baseArgs, LARGE_VIEW - 1)).toBe(false);
    expect(shouldSplitSort({ ...baseArgs, searchExpression: 'KQL("""x""")' }, LARGE_VIEW)).toBe(
      false
    );
  });
});

describe('runSplitSortPage', () => {
  it('runs the general query for small views', async () => {
    const { plan, calls } = fakePlan(0, [row('a', 3)], []);
    const rows = await runSplitSortPage(plan, baseArgs, {
      runQuery: runner(calls, []),
      viewSize: 10,
    });
    expect(rows).toEqual([row('general', 1)]);
    expect(calls).toEqual(['general']);
  });

  it('reads only value rows when they fill the page', async () => {
    const values = [row('a', 3), row('b', 2), row('c', 1)];
    const { plan, calls } = fakePlan(0, values, []);
    const rows = await runSplitSortPage(plan, baseArgs, {
      runQuery: runner(calls, values),
      viewSize: LARGE_VIEW,
    });
    expect(rows).toEqual(values);
    expect(calls).toEqual(['values cursor=- limit=3']);
  });

  it('completes the page with the first empty rows after the last value row', async () => {
    const values = [row('a', 3)];
    const { plan, calls } = fakePlan(0, values, [row('x', 0), row('y', 0)]);
    const rows = await runSplitSortPage(plan, baseArgs, {
      runQuery: runner(calls, values),
      viewSize: LARGE_VIEW,
    });
    expect(rows).toEqual([row('a', 3), row('x', 0), row('y', 0)]);
    expect(calls).toEqual(['values cursor=- limit=3', 'empty after=- limit=2']);
  });

  it('reads only empty rows when the cursor is in the empty block', async () => {
    const { plan, calls } = fakePlan(null, [], [row('x', null), row('y', null), row('z', null)]);
    const cursor = {
      sortField: 'alert_count',
      sortDirection: 'desc' as const,
      sortValue: null,
      entityId: 'w',
    };
    await runSplitSortPage(
      plan,
      { ...baseArgs, cursor },
      {
        runQuery: runner(calls, []),
        viewSize: LARGE_VIEW,
      }
    );
    expect(calls).toEqual(['empty after=w limit=3']);
  });

  it('puts empty rows first for a 0 empty value in ascending order', async () => {
    const values = [row('a', 1), row('b', 2)];
    const { plan, calls } = fakePlan(0, values, [row('x', 0)]);
    const rows = await runSplitSortPage(
      plan,
      { ...baseArgs, sort: { field: 'alert_count', direction: 'asc' } },
      { runQuery: runner(calls, values), viewSize: LARGE_VIEW }
    );
    expect(rows).toEqual([row('x', 0), row('a', 1), row('b', 2)]);
    expect(calls).toEqual(['empty after=- limit=3', 'values cursor=- limit=2']);
  });

  it('keeps null empty rows last in ascending order', async () => {
    const values = [row('a', 1)];
    const { plan, calls } = fakePlan(null, values, [row('x', null), row('y', null)]);
    const rows = await runSplitSortPage(
      plan,
      { ...baseArgs, sort: { field: 'alert_count', direction: 'asc' } },
      { runQuery: runner(calls, values), viewSize: LARGE_VIEW }
    );
    expect(rows).toEqual([row('a', 1), row('x', null), row('y', null)]);
  });

  it('runs the general query when the empty rows can not be read', async () => {
    const { plan, calls } = fakePlan(0, [row('a', 3)], null);
    const rows = await runSplitSortPage(plan, baseArgs, {
      runQuery: runner(calls, [row('a', 3)]),
      viewSize: LARGE_VIEW,
    });
    expect(rows).toEqual([row('general', 1)]);
    expect(calls[calls.length - 1]).toBe('general');
  });
});

describe('buildValueCursorClause', () => {
  it('keeps the rows after the cursor without the empty rows', () => {
    expect(
      buildValueCursorClause({
        sortField: 'alert_count',
        sortDirection: 'desc',
        sortValue: 5,
        entityId: 'host:a',
      })
    ).toEqual(['| WHERE (alert_count < 5) OR (alert_count == 5 AND entity.id > "host:a")']);
  });

  it('adds nothing on the first page or in the empty block', () => {
    expect(buildValueCursorClause(null)).toEqual([]);
    expect(
      buildValueCursorClause({
        sortField: 'alert_count',
        sortDirection: 'desc',
        sortValue: null,
        entityId: 'host:a',
      })
    ).toEqual([]);
  });
});

describe('buildEmptyRowsQuery', () => {
  it('reads entities in view without a value, after the cursor, by entity.id', () => {
    const query = buildEmptyRowsQuery(
      baseArgs,
      {
        excludeIds: ['host:a'],
        emptyColumns: 'alert_count = TO_LONG(0)',
        columns: ['alert_count'],
      },
      'host:b',
      11
    );
    expect(query).toContain('| WHERE NOT entity.id IN ("host:a")');
    expect(query).toContain('| WHERE entity.id > "host:b"');
    expect(query).toContain('| SORT entity.id ASC\n| LIMIT 11');
    expect(query).toContain('| EVAL alert_count = TO_LONG(0)');
    expect(query).not.toContain('LOOKUP JOIN');
  });
});
