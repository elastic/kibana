/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryArgs, Row } from '../common';
import type { EntityAggregation } from './esql';
import {
  applyResolvedEntityFilterOverrides,
  fetchResolvedEntityFilterOverrides,
  getMergedRowsByEntity,
  isFilteringByGroupValue,
  withEntityAliases,
  withResolvedEntityValues,
} from './resolved_entities';

const ARGS: QueryArgs = {
  namespace: 'default',
  timeRange: '7d',
  sort: { field: 'entity.name', direction: 'desc' },
  pageSize: 25,
  rowsMode: 'resolved',
  concreteEntityIndexName: '.entities.v2.latest.default-00001',
  anomalyJobIds: [],
};

const row = (id: string, extra: Row = {}): Row => ({ 'entity.id': id, ...extra });

/** A runner that answers nothing, and the text of the queries it was given. */
const recordQueries = () => {
  const queries: string[] = [];
  const runQuery = async (steps: readonly string[]): Promise<Row[]> => {
    queries.push(steps.join('\n'));
    return [];
  };
  return { runQuery, queries };
};

describe('buildResolvedEntityValuesQuery', () => {
  it('reads the aliases of the targets, then joins the targets own values in', async () => {
    const { runQuery, queries } = recordQueries();
    await withResolvedEntityValues([row('host:a'), row('host:b')], ARGS, runQuery);
    expect(queries[0]).toMatchSnapshot();
  });
});

describe('withResolvedEntityValues', () => {
  const GROUP_VALUES = row('host:a', {
    'asset.criticality': 'extreme_impact',
    'entity.source': ['aws', 'okta'],
  });

  it("gives a row the values of its group, and keeps its other fields and the other rows' as they are", async () => {
    const runQuery = jest.fn(async () => [GROUP_VALUES]);

    const rows = await withResolvedEntityValues(
      [
        row('host:a', { 'entity.name': 'a', 'asset.criticality': 'low_impact' }),
        row('host:b', { 'entity.name': 'b', 'asset.criticality': 'low_impact' }),
      ],
      ARGS,
      runQuery
    );

    expect(rows).toEqual([
      row('host:a', {
        'entity.name': 'a',
        'asset.criticality': 'extreme_impact',
        'entity.source': ['aws', 'okta'],
      }),
      row('host:b', { 'entity.name': 'b', 'asset.criticality': 'low_impact' }),
    ]);
  });

  it('reads the groups of every row in one query', async () => {
    const runQuery = jest.fn(async (_steps: readonly string[]) => []);

    await withResolvedEntityValues([row('host:a'), row('host:b')], ARGS, runQuery);

    expect(runQuery).toHaveBeenCalledTimes(1);
    expect(runQuery.mock.calls[0][0].join('\n')).toContain('IN ("host:a", "host:b")');
  });

  it('reads a row per group even past the 1,000 rows ES|QL returns by default', async () => {
    const runQuery = jest.fn(async (_steps: readonly string[]) => []);
    const rows = Array.from({ length: 1_001 }, (_, i) => row(`host:${i}`));

    await withResolvedEntityValues(rows, ARGS, runQuery);

    expect(runQuery.mock.calls[0][0].at(-1)).toBe('| LIMIT 1001');
  });

  it('splits a long list of rows into several queries', async () => {
    const runQuery = jest.fn(async () => []);
    const manyRows = Array.from({ length: 2_001 }, (_, i) => row(`host:${i}`));

    await withResolvedEntityValues(manyRows, ARGS, runQuery);

    expect(runQuery).toHaveBeenCalledTimes(2);
  });

  it('does not query without rows', async () => {
    const runQuery = jest.fn(async () => []);

    expect(await withResolvedEntityValues([], ARGS, runQuery)).toEqual([]);
    expect(runQuery).not.toHaveBeenCalled();
  });
});

const CRITICALITY_FILTER = 'asset.criticality IN ("high_impact")';

describe('isFilteringByGroupValue', () => {
  it.each([
    ['criticality', CRITICALITY_FILTER],
    ['sources', 'MV_CONTAINS(entity.source, "okta")'],
    [
      'watchlists',
      'entity.EngineMetadata.Type IN ("host") AND MV_CONTAINS(entity.attributes.watchlists, "w1")',
    ],
  ])('is true for a filter on %s of resolved rows', (_name, entityExpression) => {
    expect(isFilteringByGroupValue({ rowsMode: 'resolved', entityExpression })).toBe(true);
  });

  it.each([
    ['no filters', { rowsMode: 'resolved' }],
    [
      'a filter on other columns',
      { rowsMode: 'resolved', entityExpression: 'entity.EngineMetadata.Type IN ("host")' },
    ],
    ['individual rows', { rowsMode: 'individual', entityExpression: CRITICALITY_FILTER }],
  ] as const)('is false for %s', (_name, args) => {
    expect(isFilteringByGroupValue(args)).toBe(false);
  });
});

describe('buildResolvedEntityFilterOverridesQuery', () => {
  it('compares the resolved entity with its main entity on the filters, and keeps those that differ', async () => {
    const { runQuery, queries } = recordQueries();
    await fetchResolvedEntityFilterOverrides(
      { ...ARGS, entityExpression: CRITICALITY_FILTER },
      runQuery
    );
    expect(queries[0]).toMatchSnapshot();
  });
});

describe('fetchResolvedEntityFilterOverrides', () => {
  const FILTERED_ARGS: QueryArgs = { ...ARGS, entityExpression: CRITICALITY_FILTER };

  it('splits the resolved entities into those the filters add and those they remove', async () => {
    const runQuery = jest.fn(async () => [
      row('host:a', { resolved_entity_matches: true }),
      row('host:b', { resolved_entity_matches: false }),
      row('host:c', { resolved_entity_matches: true }),
    ]);

    expect(await fetchResolvedEntityFilterOverrides(FILTERED_ARGS, runQuery)).toEqual({
      include: ['host:a', 'host:c'],
      exclude: ['host:b'],
    });
  });

  it.each([
    ['without filters', ARGS],
    [
      'for filters on other columns',
      { ...ARGS, entityExpression: 'entity.EngineMetadata.Type IN ("host")' },
    ],
    ['for individual rows', { ...FILTERED_ARGS, rowsMode: 'individual' }],
  ] as const)('has no overrides, and no query, %s', async (_name, args) => {
    const runQuery = jest.fn(async () => []);

    expect(await fetchResolvedEntityFilterOverrides(args, runQuery)).toEqual({
      include: [],
      exclude: [],
    });
    expect(runQuery).not.toHaveBeenCalled();
  });

  it('fails when too many resolved entities differ to list them in the filter', async () => {
    const runQuery = jest.fn(async () =>
      Array.from({ length: 4_001 }, (_, i) => row(`host:${i}`, { resolved_entity_matches: true }))
    );

    await expect(fetchResolvedEntityFilterOverrides(FILTERED_ARGS, runQuery)).rejects.toThrow(
      'too many resolved entities'
    );
  });
});

describe('applyResolvedEntityFilterOverrides', () => {
  it('is the filters themselves without overrides', () => {
    expect(applyResolvedEntityFilterOverrides(CRITICALITY_FILTER)).toBe(CRITICALITY_FILTER);
    expect(
      applyResolvedEntityFilterOverrides(CRITICALITY_FILTER, { include: [], exclude: [] })
    ).toBe(CRITICALITY_FILTER);
  });

  it('removes the resolved entities that do not pass, though their main entity does', () => {
    expect(
      applyResolvedEntityFilterOverrides(CRITICALITY_FILTER, { include: [], exclude: ['host:a'] })
    ).toBe(`(${CRITICALITY_FILTER}) AND NOT entity.id IN ("host:a")`);
  });

  it('adds the resolved entities that pass, though their main entity does not', () => {
    expect(
      applyResolvedEntityFilterOverrides(CRITICALITY_FILTER, { include: ['host:b'], exclude: [] })
    ).toBe(`(${CRITICALITY_FILTER}) OR entity.id IN ("host:b")`);
  });

  it('removes and adds resolved entities', () => {
    expect(
      applyResolvedEntityFilterOverrides(CRITICALITY_FILTER, {
        include: ['host:b'],
        exclude: ['host:a'],
      })
    ).toBe(`((${CRITICALITY_FILTER}) AND NOT entity.id IN ("host:a")) OR entity.id IN ("host:b")`);
  });
});

const aliasRow = (id: string, resolvedTo?: string): Row => ({
  'entity.id': id,
  ...(resolvedTo ? { 'entity.relationships.resolution.resolved_to': resolvedTo } : {}),
});

describe('withEntityAliases', () => {
  it('adds the aliases of the rows after them', async () => {
    const alias = aliasRow('host:a1', 'host:a');
    const runQuery = jest.fn(async (_steps: readonly string[]) => [alias]);
    const rows = [aliasRow('host:a'), aliasRow('host:b')];

    expect(await withEntityAliases(rows, ARGS, runQuery)).toEqual([...rows, alias]);
    expect(runQuery).toHaveBeenCalledTimes(1);
    expect(runQuery.mock.calls[0][0].join('\n')).toContain('IN ("host:a", "host:b")');
  });

  it('does not query without rows', async () => {
    const runQuery = jest.fn(async (_steps: readonly string[]): Promise<Row[]> => []);

    expect(await withEntityAliases([], ARGS, runQuery)).toEqual([]);
    expect(runQuery).not.toHaveBeenCalled();
  });

  it('reads the aliases in pages when a response cannot hold them all', async () => {
    const pageOf = (from: number, count: number) =>
      Array.from({ length: count }, (_, i) =>
        aliasRow(`host:a${String(from + i).padStart(5, '0')}`, 'host:a')
      );
    const runQuery = jest
      .fn<Promise<Row[]>, [readonly string[]]>()
      .mockResolvedValueOnce(pageOf(0, 10_000))
      .mockResolvedValueOnce(pageOf(10_000, 3));

    const rows = await withEntityAliases([aliasRow('host:a')], ARGS, runQuery);

    expect(rows).toHaveLength(1 + 10_003);
    expect(runQuery).toHaveBeenCalledTimes(2);
    expect(runQuery.mock.calls[0][0].join('\n')).not.toContain('entity.id >');
    expect(runQuery.mock.calls[1][0].join('\n')).toContain('entity.id > "host:a09999"');
  });
});

describe('getMergedRowsByEntity', () => {
  const AGGREGATIONS: EntityAggregation[] = [
    { field: 'alert_count', aggregation: 'COUNT(*)', resolvedEntity: 'SUM' },
    { field: 'last_seen_alert', aggregation: 'MAX(`@timestamp`)', resolvedEntity: 'MAX' },
  ];

  it('merges the rows of an entity read in several queries: counts add up, latest wins', () => {
    expect(
      getMergedRowsByEntity(
        [
          { 'entity.id': 'host:a', alert_count: 2, last_seen_alert: '2026-10-18T10:00:00.000Z' },
          { 'entity.id': 'host:b', alert_count: 1, last_seen_alert: '2026-10-17T10:00:00.000Z' },
          { 'entity.id': 'host:a', alert_count: 3, last_seen_alert: '2026-10-18T12:00:00.000Z' },
        ],
        AGGREGATIONS
      )
    ).toEqual([
      { 'entity.id': 'host:a', alert_count: 5, last_seen_alert: '2026-10-18T12:00:00.000Z' },
      { 'entity.id': 'host:b', alert_count: 1, last_seen_alert: '2026-10-17T10:00:00.000Z' },
    ]);
  });

  it('keeps a value one of the rows lacks, and compares numbers as numbers', () => {
    expect(
      getMergedRowsByEntity(
        [
          { 'entity.id': 'host:a', alert_count: null, last_seen_alert: 9 },
          { 'entity.id': 'host:a', alert_count: 4, last_seen_alert: 10 },
        ],
        AGGREGATIONS
      )
    ).toEqual([{ 'entity.id': 'host:a', alert_count: 4, last_seen_alert: 10 }]);
  });
});
