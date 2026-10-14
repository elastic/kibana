/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryArgs, Row } from '../common';
import { ESQL_MAX_RESULT_ROWS } from './esql';
import { buildEntityListSortPlan, buildEmptyRowsQuery, fetchSplitSortPage } from './split_sort';
import type { SplitSortPlan } from './split_sort';

const baseArgs: QueryArgs = {
  namespace: 'default',
  timeRange: '30d',
  sort: { field: 'alert_count', direction: 'desc' },
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
    emptyValue,
    buildValueRowsQuery: (_args, limit) => [`values limit=${limit}`],
    fetchEmptyRows: async (_args, _runQuery, limit) => {
      calls.push(`empty limit=${limit}`);
      return emptyRows == null ? null : emptyRows.slice(0, limit);
    },
    buildSortQuery: () => ['general'],
  };
  return { plan, calls };
};

const runner = (calls: string[], valueRows: Row[]) => async (steps: readonly string[]) => {
  const query = steps.join('\n');
  calls.push(query);
  if (query === 'general') return [row('general', 1)];
  const limit = Number(query.match(/limit=(\d+)/)?.[1]);
  return valueRows.slice(0, limit);
};

describe('fetchSplitSortPage', () => {
  it('runs the general query for a search', async () => {
    const { plan, calls } = fakePlan(0, [row('a', 3)], []);
    await fetchSplitSortPage(
      plan,
      { ...baseArgs, searchExpression: 'KQL("""x""")' },
      { runQuery: runner(calls, []) }
    );
    expect(calls).toEqual(['general']);
  });

  it('reads only value rows when they fill the page', async () => {
    const values = [row('a', 3), row('b', 2), row('c', 1)];
    const { plan, calls } = fakePlan(0, values, []);
    const rows = await fetchSplitSortPage(plan, baseArgs, {
      runQuery: runner(calls, values),
    });
    expect(rows).toEqual(values);
    expect(calls).toEqual(['values limit=3']);
  });

  it('completes the page with the first empty rows after the last value row', async () => {
    const values = [row('a', 3)];
    const { plan, calls } = fakePlan(0, values, [row('x', 0), row('y', 0)]);
    const rows = await fetchSplitSortPage(plan, baseArgs, {
      runQuery: runner(calls, values),
    });
    expect(rows).toEqual([row('a', 3), row('x', 0), row('y', 0)]);
    expect(calls).toEqual(['values limit=3', 'empty limit=2']);
  });

  it('puts empty rows first for a 0 empty value in ascending order', async () => {
    const values = [row('a', 1), row('b', 2)];
    const { plan, calls } = fakePlan(0, values, [row('x', 0)]);
    const rows = await fetchSplitSortPage(
      plan,
      { ...baseArgs, sort: { field: 'alert_count', direction: 'asc' } },
      { runQuery: runner(calls, values) }
    );
    expect(rows).toEqual([row('x', 0), row('a', 1), row('b', 2)]);
    expect(calls).toEqual(['empty limit=3', 'values limit=2']);
  });

  it('keeps null empty rows last in ascending order', async () => {
    const values = [row('a', 1)];
    const { plan, calls } = fakePlan(null, values, [row('x', null), row('y', null)]);
    const rows = await fetchSplitSortPage(
      plan,
      { ...baseArgs, sort: { field: 'alert_count', direction: 'asc' } },
      { runQuery: runner(calls, values) }
    );
    expect(rows).toEqual([row('a', 1), row('x', null), row('y', null)]);
  });

  it('runs the general query when the empty rows can not be read', async () => {
    const { plan, calls } = fakePlan(0, [row('a', 3)], null);
    const rows = await fetchSplitSortPage(plan, baseArgs, {
      runQuery: runner(calls, [row('a', 3)]),
    });
    expect(rows).toEqual([row('general', 1)]);
    expect(calls[calls.length - 1]).toBe('general');
  });
});

describe('buildEmptyRowsQuery', () => {
  it('reads entities in view without a value, by entity.id', () => {
    const query = buildEmptyRowsQuery(
      baseArgs,
      {
        conditions: ['risk IS NULL'],
        emptyColumns: 'alert_count = TO_LONG(0)',
        columns: ['alert_count'],
      },
      11
    ).join('\n');
    expect(query).toContain('| WHERE risk IS NULL');
    expect(query).toContain('| SORT entity.id ASC\n| LIMIT 11');
    expect(query).toContain('| EVAL alert_count = TO_LONG(0)');
    expect(query).not.toContain('LOOKUP JOIN');
  });
});

describe('buildEntityListSortPlan', () => {
  const plan = buildEntityListSortPlan({
    sortField: 'alert_count',
    emptyValue: 0,
    buildSourceRows: () => ['FROM alerts'],
    buildSortQuery: () => ['general'],
    aggregations: [{ field: 'alert_count', aggregation: 'COUNT(*)', resolvedEntity: 'SUM' }],
    columns: ['alert_count'],
    emptyColumns: 'alert_count = 0',
  });
  const ids = (count: number): Row[] =>
    Array.from({ length: count }, (_, i) => ({ 'entity.id': `host:${i}` }));
  /** Answers the value ids query with `valueIds` and records every query and its LIMIT. */
  const recordingRunner = (valueIds: Row[]) => {
    const limits: number[] = [];
    const runQuery = async (steps: readonly string[]): Promise<Row[]> => {
      const query = steps.join('\n');
      limits.push(Number(query.match(/LIMIT (\d+)\s*$/m)?.[1]));
      return query.includes('NOT entity.id IN') ? [row('empty', 0)] : valueIds;
    };
    return { runQuery, limits };
  };

  it('excludes the value ids from the empty rows', async () => {
    const { runQuery } = recordingRunner(ids(2));
    expect(await plan.fetchEmptyRows(baseArgs, runQuery, 3)).toEqual([row('empty', 0)]);
  });

  it('gives up when the excluded ids are longer than ES|QL parses', async () => {
    const longIds = Array.from({ length: 9_000 }, (_, i) => ({
      'entity.id': `user:${'x'.repeat(110)}-${i}`,
    }));
    const { runQuery, limits } = recordingRunner(longIds);
    expect(await plan.fetchEmptyRows(baseArgs, runQuery, 3)).toBeNull();
    // Only the value ids query ran.
    expect(limits).toHaveLength(1);
  });

  it('gives up when ES|QL returns as many value ids as it can', async () => {
    const { runQuery, limits } = recordingRunner(ids(ESQL_MAX_RESULT_ROWS));
    expect(await plan.fetchEmptyRows(baseArgs, runQuery, 3)).toBeNull();
    expect(Math.max(...limits)).toBeLessThanOrEqual(ESQL_MAX_RESULT_ROWS);
  });
});
