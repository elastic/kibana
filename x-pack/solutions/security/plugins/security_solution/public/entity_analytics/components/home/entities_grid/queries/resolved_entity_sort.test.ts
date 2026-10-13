/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryArgs, Row } from '../common';
import type { SortPageContext } from './types';
import { fetchResolvedEntitySortPage, withResolvedEntityRows } from './resolved_entity_sort';

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

const GROUP_ROWS_QUERY = 'GROUPS';

const row = (id: string, criticality: string | null): Row => ({
  'entity.id': id,
  'asset.criticality': criticality,
});

const getIds = (rows: Row[]) => rows.map((r) => r['entity.id']);

/** The group rows and the entity rows a plan reads, and the ids that a search matches. */
const createPlan = ({
  groups,
  entities,
  searched = [],
}: {
  groups: Row[];
  entities: Row[];
  searched?: string[];
}) => {
  const runQuery = jest.fn(
    async (query: string): Promise<Row[]> =>
      query === GROUP_ROWS_QUERY ? groups : searched.map((id) => ({ 'entity.id': id }))
  );
  const fetchEntityRows = jest.fn(async (_extraRows: number) => entities);
  return {
    runQuery,
    fetchEntityRows,
    options: { buildResolvedEntityRowsQuery: () => GROUP_ROWS_QUERY, fetchEntityRows },
  };
};

describe('fetchResolvedEntitySortPage', () => {
  it('merges the groups and the other entities in the order of the sort', async () => {
    const { runQuery, options } = createPlan({
      groups: [row('host:g1', 'medium_impact'), row('host:g2', 'low_impact')],
      entities: [row('host:e1', 'low_impact'), row('host:e2', 'high_impact'), row('host:e3', null)],
    });

    const page = await fetchResolvedEntitySortPage({ ...ARGS, pageSize: 10 }, runQuery, options);

    // Criticality sorts by its label, so medium comes before low and high.
    expect(getIds(page)).toEqual(['host:g1', 'host:e1', 'host:g2', 'host:e2', 'host:e3']);
  });

  it('puts the rows without a value last in both directions, and breaks ties by entity id', async () => {
    const { runQuery, options } = createPlan({
      groups: [row('host:b', 'low_impact'), row('host:z', null)],
      entities: [row('host:a', 'low_impact'), row('host:c', null)],
    });
    const fetch = (direction: 'asc' | 'desc') =>
      fetchResolvedEntitySortPage(
        { ...ARGS, pageSize: 10, sort: { field: 'asset.criticality', direction } },
        runQuery,
        options
      );

    expect(getIds(await fetch('asc'))).toEqual(['host:a', 'host:b', 'host:c', 'host:z']);
    expect(getIds(await fetch('desc'))).toEqual(['host:a', 'host:b', 'host:c', 'host:z']);
  });

  it('sorts numbers by their value', async () => {
    const { runQuery, options } = createPlan({
      groups: [{ 'entity.id': 'host:g', alert_count: 10 }],
      entities: [
        { 'entity.id': 'host:a', alert_count: 9 },
        { 'entity.id': 'host:b', alert_count: 100 },
      ],
    });

    const page = await fetchResolvedEntitySortPage(
      { ...ARGS, pageSize: 10, sort: { field: 'alert_count', direction: 'desc' } },
      runQuery,
      options
    );

    expect(getIds(page)).toEqual(['host:b', 'host:g', 'host:a']);
  });

  it('drops an entity that heads a group, for the row of its group', async () => {
    const { runQuery, options } = createPlan({
      groups: [row('host:g1', 'extreme_impact')],
      entities: [row('host:g1', 'low_impact'), row('host:e1', 'low_impact')],
    });

    const page = await fetchResolvedEntitySortPage({ ...ARGS, pageSize: 10 }, runQuery, options);

    expect(page).toEqual([row('host:e1', 'low_impact'), row('host:g1', 'extreme_impact')]);
  });

  it('reads as many extra entities as there are groups, which may be dropped', async () => {
    const { runQuery, options, fetchEntityRows } = createPlan({
      groups: [row('host:g1', 'low_impact'), row('host:g2', 'low_impact')],
      entities: [],
    });

    await fetchResolvedEntitySortPage(ARGS, runQuery, options);

    expect(fetchEntityRows).toHaveBeenCalledWith(2);
  });

  it('keeps the groups after the cursor, and the page and its extra row', async () => {
    const { runQuery, options } = createPlan({
      groups: [row('host:g1', 'medium_impact'), row('host:g2', 'low_impact')],
      entities: [row('host:e1', 'low_impact'), row('host:e2', 'low_impact')],
    });

    const page = await fetchResolvedEntitySortPage(
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
      options
    );

    // host:g1 is the cursor itself, so the page starts after it.
    expect(getIds(page)).toEqual(['host:e1', 'host:e2', 'host:g2']);
  });

  it('keeps only the groups whose main entity the search matches', async () => {
    const { runQuery, options } = createPlan({
      groups: [row('host:g1', 'low_impact'), row('host:g2', 'low_impact')],
      entities: [],
      searched: ['host:g2'],
    });

    const page = await fetchResolvedEntitySortPage(
      { ...ARGS, pageSize: 10, searchExpression: 'KQL("""entity.name: web*""")' },
      runQuery,
      options
    );

    expect(getIds(page)).toEqual(['host:g2']);
  });

  it('does not search without a search', async () => {
    const { runQuery, options } = createPlan({ groups: [row('host:g1', null)], entities: [] });

    await fetchResolvedEntitySortPage(ARGS, runQuery, options);

    expect(runQuery).toHaveBeenCalledTimes(1);
  });

  it('fails when there are more groups than a page can be built from', async () => {
    const { runQuery, options } = createPlan({
      groups: Array.from({ length: 9_997 }, (_, i) => row(`host:${i}`, null)),
      entities: [],
    });

    await expect(fetchResolvedEntitySortPage(ARGS, runQuery, options)).rejects.toThrow(
      'Too many groups'
    );
  });
});

describe('withResolvedEntityRows', () => {
  const entityPage = [row('host:b', 'low_impact')];

  const createFetcher = (isResolvedEntityRows?: (args: QueryArgs) => boolean) => {
    const fetchPage = jest.fn(async (_args: QueryArgs, _ctx: SortPageContext) => entityPage);
    const runQuery = jest.fn(async (_query: string): Promise<Row[]> => []);
    const ctx = { runQuery, fetchViewSize: async () => 0 };
    return {
      fetchPage,
      runQuery,
      fetchSortPage: (args: QueryArgs) =>
        withResolvedEntityRows(fetchPage, () => GROUP_ROWS_QUERY, isResolvedEntityRows)(args, ctx),
    };
  };

  it('reads the groups apart, and asks the page for the entities the groups may drop', async () => {
    const { fetchPage, runQuery, fetchSortPage } = createFetcher();
    runQuery.mockResolvedValueOnce([row('host:a', 'high_impact'), row('host:c', null)]);

    const page = await fetchSortPage(ARGS);

    expect(runQuery).toHaveBeenCalledWith(GROUP_ROWS_QUERY);
    expect(fetchPage).toHaveBeenCalledWith(
      { ...ARGS, pageSize: ARGS.pageSize + 2 },
      expect.anything()
    );
    // Descending by value: 'low_impact' > 'high_impact', and the row without a value last.
    expect(getIds(page)).toEqual(['host:b', 'host:a', 'host:c']);
  });

  it('reads individual rows with the page as it is', async () => {
    const { fetchPage, runQuery, fetchSortPage } = createFetcher();
    const args: QueryArgs = { ...ARGS, rowsMode: 'individual' };

    expect(await fetchSortPage(args)).toBe(entityPage);
    expect(fetchPage).toHaveBeenCalledWith(args, expect.anything());
    expect(runQuery).not.toHaveBeenCalled();
  });

  it('leaves the rows that do not show a value of their group to the page', async () => {
    const { runQuery, fetchSortPage } = createFetcher(({ sort }) => sort.field !== 'entity.name');

    await fetchSortPage({ ...ARGS, sort: { field: 'entity.name', direction: 'asc' } });

    expect(runQuery).not.toHaveBeenCalled();
  });
});
