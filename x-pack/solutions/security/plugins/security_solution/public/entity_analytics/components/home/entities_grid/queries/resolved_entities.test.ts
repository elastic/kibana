/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryArgs, Row } from '../common';
import {
  applyResolvedEntityFilterOverrides,
  fetchResolvedEntityFilterOverrides,
  getPartsByResolvedEntity,
  needsResolvedEntityFilterOverrides,
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

describe('needsResolvedEntityFilterOverrides', () => {
  it.each([
    ['criticality', CRITICALITY_FILTER],
    ['sources', 'MV_CONTAINS(entity.source, "okta")'],
    [
      'watchlists',
      'entity.EngineMetadata.Type IN ("host") AND MV_CONTAINS(entity.attributes.watchlists, "w1")',
    ],
  ])('is true for a filter on %s of resolved rows', (_name, entityExpression) => {
    expect(needsResolvedEntityFilterOverrides({ rowsMode: 'resolved', entityExpression })).toBe(
      true
    );
  });

  it.each([
    ['no filters', { rowsMode: 'resolved' }],
    [
      'a filter on other columns',
      { rowsMode: 'resolved', entityExpression: 'entity.EngineMetadata.Type IN ("host")' },
    ],
    ['individual rows', { rowsMode: 'individual', entityExpression: CRITICALITY_FILTER }],
  ] as const)('is false for %s', (_name, args) => {
    expect(needsResolvedEntityFilterOverrides(args)).toBe(false);
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

  it('fails when the aliases are more than the query of the read can list', async () => {
    const runQuery = jest.fn(async (_steps: readonly string[]) =>
      Array.from({ length: 2_001 }, (_, i) => aliasRow(`host:a${i}`, 'host:a'))
    );

    await expect(withEntityAliases([aliasRow('host:a')], ARGS, runQuery)).rejects.toThrow(
      'too many aliases'
    );
  });
});

describe('getPartsByResolvedEntity', () => {
  const getIdParts = (parts: Row[][]) => parts.map((part) => part.map((r) => r['entity.id']));

  it('cuts the rows into parts of at most the given size', () => {
    const rows = ['host:a', 'host:b', 'host:c'].map((id) => aliasRow(id));

    expect(getIdParts(getPartsByResolvedEntity(rows, 2))).toEqual([
      ['host:a', 'host:b'],
      ['host:c'],
    ]);
  });

  it('keeps a resolved entity in one part with its aliases', () => {
    const rows = [
      aliasRow('host:a'),
      aliasRow('host:b'),
      aliasRow('host:b1', 'host:b'),
      aliasRow('host:a1', 'host:a'),
    ];

    expect(getIdParts(getPartsByResolvedEntity(rows, 3))).toEqual([
      ['host:a', 'host:a1'],
      ['host:b', 'host:b1'],
    ]);
  });

  it('fails for a resolved entity with more aliases than a part holds', () => {
    const rows = [aliasRow('host:a'), aliasRow('host:a1', 'host:a'), aliasRow('host:a2', 'host:a')];

    expect(() => getPartsByResolvedEntity(rows, 2)).toThrow('too many aliases');
  });
});
