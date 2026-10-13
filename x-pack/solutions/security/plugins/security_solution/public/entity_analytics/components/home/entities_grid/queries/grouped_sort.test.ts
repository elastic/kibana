/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryArgs, Row } from '../common';
import { fetchGroupedSortPage } from './grouped_sort';

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

const ENTITIES_QUERY = 'ENTITIES';

const row = (id: string, criticality: string | null): Row => ({
  'entity.id': id,
  'asset.criticality': criticality,
});

const getIds = (rows: Row[]) => rows.map((r) => r['entity.id']);

/** A runner answering the group rows query, the search query and the entity rows query. */
const createRunner = ({
  groups,
  entities,
  searched = [],
}: {
  groups: Row[];
  entities: Row[];
  searched?: string[];
}) =>
  jest.fn(async (query: string): Promise<Row[]> => {
    if (query === ENTITIES_QUERY) return entities;
    if (query.includes('alias_rank')) return groups;
    return searched.map((id) => ({ 'entity.id': id }));
  });

describe('fetchGroupedSortPage', () => {
  it('merges the groups and the other entities in the order of the sort', async () => {
    const runQuery = createRunner({
      groups: [row('host:g1', 'medium_impact'), row('host:g2', 'low_impact')],
      entities: [row('host:e1', 'low_impact'), row('host:e2', 'high_impact'), row('host:e3', null)],
    });

    const page = await fetchGroupedSortPage(
      { ...ARGS, pageSize: 10 },
      runQuery,
      () => ENTITIES_QUERY
    );

    // Criticality sorts by its label, so medium comes before low and high.
    expect(getIds(page)).toEqual(['host:g1', 'host:e1', 'host:g2', 'host:e2', 'host:e3']);
  });

  it('puts the rows without a value last in both directions, and breaks ties by entity id', async () => {
    const runQuery = createRunner({
      groups: [row('host:b', 'low_impact'), row('host:z', null)],
      entities: [row('host:a', 'low_impact'), row('host:c', null)],
    });
    const fetch = (direction: 'asc' | 'desc') =>
      fetchGroupedSortPage(
        { ...ARGS, pageSize: 10, sort: { field: 'asset.criticality', direction } },
        runQuery,
        () => ENTITIES_QUERY
      );

    expect(getIds(await fetch('asc'))).toEqual(['host:a', 'host:b', 'host:c', 'host:z']);
    expect(getIds(await fetch('desc'))).toEqual(['host:a', 'host:b', 'host:c', 'host:z']);
  });

  it('drops an entity that heads a group, for the row of its group', async () => {
    const runQuery = createRunner({
      groups: [row('host:g1', 'extreme_impact')],
      entities: [row('host:g1', 'low_impact'), row('host:e1', 'low_impact')],
    });

    const page = await fetchGroupedSortPage(
      { ...ARGS, pageSize: 10 },
      runQuery,
      () => ENTITIES_QUERY
    );

    expect(page).toEqual([row('host:e1', 'low_impact'), row('host:g1', 'extreme_impact')]);
  });

  it('reads as many extra entities as there are groups, which may be dropped', async () => {
    const runQuery = createRunner({
      groups: [row('host:g1', 'low_impact'), row('host:g2', 'low_impact')],
      entities: [],
    });
    const buildEntitiesQuery = jest.fn(() => ENTITIES_QUERY);

    await fetchGroupedSortPage(ARGS, runQuery, buildEntitiesQuery);

    expect(buildEntitiesQuery).toHaveBeenCalledWith(2);
  });

  it('keeps the groups after the cursor, and the page and its extra row', async () => {
    const runQuery = createRunner({
      groups: [row('host:g1', 'medium_impact'), row('host:g2', 'low_impact')],
      entities: [row('host:e1', 'low_impact'), row('host:e2', 'low_impact')],
    });

    const page = await fetchGroupedSortPage(
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
      runQuery,
      () => ENTITIES_QUERY
    );

    // host:g1 is the cursor itself, so the page starts after it.
    expect(getIds(page)).toEqual(['host:e1', 'host:e2', 'host:g2']);
  });

  it('keeps only the groups whose main entity the search matches', async () => {
    const runQuery = createRunner({
      groups: [row('host:g1', 'low_impact'), row('host:g2', 'low_impact')],
      entities: [],
      searched: ['host:g2'],
    });

    const page = await fetchGroupedSortPage(
      { ...ARGS, pageSize: 10, searchExpression: 'KQL("""entity.name: web*""")' },
      runQuery,
      () => ENTITIES_QUERY
    );

    expect(getIds(page)).toEqual(['host:g2']);
  });

  it('does not search without a search', async () => {
    const runQuery = createRunner({ groups: [row('host:g1', null)], entities: [] });

    await fetchGroupedSortPage(ARGS, runQuery, () => ENTITIES_QUERY);

    expect(runQuery).toHaveBeenCalledTimes(2);
  });

  it('fails when there are more groups than a page can be built from', async () => {
    const runQuery = createRunner({
      groups: Array.from({ length: 9_997 }, (_, i) => row(`host:${i}`, null)),
      entities: [],
    });

    await expect(fetchGroupedSortPage(ARGS, runQuery, () => ENTITIES_QUERY)).rejects.toThrow(
      'Too many groups'
    );
  });
});
