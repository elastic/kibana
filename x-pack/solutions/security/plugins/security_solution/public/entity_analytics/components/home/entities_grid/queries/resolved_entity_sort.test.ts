/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryArgs, Row } from '../common';
import { fetchResolvedEntitiesWithAliases, getMergedPage } from './resolved_entity_sort';

const ARGS: QueryArgs = {
  namespace: 'default',
  timeRange: '7d',
  sort: { field: 'asset.criticality', direction: 'desc' },
  cursor: null,
  pageSize: 3,
  rowsMode: 'resolved',
  concreteEntityIndexName: '.entities.v2.latest.default-00001',
  anomalyJobIds: [],
};

const WITH_ALIASES_QUERY = 'WITH ALIASES';

const row = (id: string, criticality: string | null): Row => ({
  'entity.id': id,
  'asset.criticality': criticality,
});

const getIds = (rows: Row[]) => rows.map((r) => r['entity.id']);

/** Answers the query of the resolved entities with aliases with `rows`, a search with `searched`. */
const createRunner = (rows: Row[], searched: string[] = []) =>
  jest.fn(
    async (query: string): Promise<Row[]> =>
      query === WITH_ALIASES_QUERY ? rows : searched.map((id) => ({ 'entity.id': id }))
  );

describe('fetchResolvedEntitiesWithAliases', () => {
  it('reads the resolved entities with aliases, without a search', async () => {
    const runQuery = createRunner([row('host:g1', null)]);

    expect(
      getIds(await fetchResolvedEntitiesWithAliases(ARGS, runQuery, WITH_ALIASES_QUERY))
    ).toEqual(['host:g1']);
    expect(runQuery).toHaveBeenCalledTimes(1);
  });

  it('keeps only those whose main entity the search matches', async () => {
    const runQuery = createRunner(
      [row('host:g1', 'low_impact'), row('host:g2', 'low_impact')],
      ['host:g2']
    );

    const rows = await fetchResolvedEntitiesWithAliases(
      { ...ARGS, searchExpression: 'KQL("""entity.name: web*""")' },
      runQuery,
      WITH_ALIASES_QUERY
    );

    expect(getIds(rows)).toEqual(['host:g2']);
  });

  it('fails when there are more of them than a page can be built from', async () => {
    const runQuery = createRunner(Array.from({ length: 9_997 }, (_, i) => row(`host:${i}`, null)));

    await expect(
      fetchResolvedEntitiesWithAliases(ARGS, runQuery, WITH_ALIASES_QUERY)
    ).rejects.toThrow('Too many groups');
  });
});

describe('getMergedPage', () => {
  const PAGE_ARGS: QueryArgs = { ...ARGS, pageSize: 10 };

  it('merges the resolved entities with aliases and the others in the order of the sort', () => {
    const page = getMergedPage(
      PAGE_ARGS,
      [row('host:g1', 'medium_impact'), row('host:g2', 'low_impact')],
      [row('host:e1', 'low_impact'), row('host:e2', 'high_impact'), row('host:e3', null)]
    );

    // Criticality sorts by its label, so medium comes before low and high.
    expect(getIds(page)).toEqual(['host:g1', 'host:e1', 'host:g2', 'host:e2', 'host:e3']);
  });

  it('puts the rows without a value last in both directions, and breaks ties by entity id', () => {
    const merge = (direction: 'asc' | 'desc') =>
      getMergedPage(
        { ...PAGE_ARGS, sort: { field: 'asset.criticality', direction } },
        [row('host:b', 'low_impact'), row('host:z', null)],
        [row('host:a', 'low_impact'), row('host:c', null)]
      );

    expect(getIds(merge('asc'))).toEqual(['host:a', 'host:b', 'host:c', 'host:z']);
    expect(getIds(merge('desc'))).toEqual(['host:a', 'host:b', 'host:c', 'host:z']);
  });

  it('sorts numbers by their value', () => {
    const page = getMergedPage(
      { ...PAGE_ARGS, sort: { field: 'alert_count', direction: 'desc' } },
      [{ 'entity.id': 'host:g', alert_count: 10 }],
      [
        { 'entity.id': 'host:a', alert_count: 9 },
        { 'entity.id': 'host:b', alert_count: 100 },
      ]
    );

    expect(getIds(page)).toEqual(['host:b', 'host:g', 'host:a']);
  });

  it("replaces a resolved entity's own row with its row over the aliases", () => {
    const page = getMergedPage(
      PAGE_ARGS,
      [row('host:g1', 'extreme_impact')],
      [row('host:g1', 'low_impact'), row('host:e1', 'low_impact')]
    );

    expect(page).toEqual([row('host:e1', 'low_impact'), row('host:g1', 'extreme_impact')]);
  });

  it('keeps the rows after the cursor, and the page and its extra row', () => {
    const page = getMergedPage(
      {
        ...ARGS,
        pageSize: 2,
        cursor: {
          sortField: 'asset.criticality',
          sortDirection: 'desc',
          sortValue: 'medium_impact',
          entityId: 'host:g1',
        },
      },
      [row('host:g1', 'medium_impact'), row('host:g2', 'low_impact')],
      [row('host:e1', 'low_impact'), row('host:e2', 'low_impact')]
    );

    // host:g1 is the cursor itself, so the page starts after it.
    expect(getIds(page)).toEqual(['host:e1', 'host:e2', 'host:g2']);
  });
});
