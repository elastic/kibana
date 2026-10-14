/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryArgs, Row } from '../common';
import { nativeSortQuerySpec } from './native';

const ARGS: QueryArgs = {
  namespace: 'default',
  timeRange: '7d',
  sort: { field: 'asset.criticality', direction: 'desc' },
  pageSize: 10,
  rowsMode: 'resolved',
  concreteEntityIndexName: '.entities.v2.latest.default-00001',
  anomalyJobIds: [],
};

const row = (id: string, criticality: string | null): Row => ({
  'entity.id': id,
  'asset.criticality': criticality,
});

const getIds = (rows: Row[]) => rows.map((r) => r['entity.id']);

/**
 * Answers the query of the resolved entities with aliases with `withAliases`, the check of the
 * search with `searched`, and the sort of the other entities with `others`.
 */
const createRunner = ({
  withAliases = [],
  others = [],
  searched = [],
}: {
  withAliases?: Row[];
  others?: Row[];
  searched?: string[];
}) =>
  jest.fn(async (steps: readonly string[]): Promise<Row[]> => {
    const query = steps.join('\n');
    if (query.includes('resolved_to IS NOT NULL')) return withAliases;
    if (query.includes('| KEEP `entity.id`')) return searched.map((id) => ({ 'entity.id': id }));
    return others;
  });

const fetchSorted = (args: QueryArgs, runQuery: ReturnType<typeof createRunner>) =>
  nativeSortQuerySpec.fetchSortPage(args, { runQuery });

describe('sorting resolved rows by a value over the aliases', () => {
  it('keeps the resolved entities with aliases whose main entity the search matches', async () => {
    const runQuery = createRunner({
      withAliases: [row('host:g1', 'low_impact'), row('host:g2', 'low_impact')],
      searched: ['host:g2'],
    });

    const rows = await fetchSorted(
      { ...ARGS, searchExpression: 'KQL("""entity.name: web*""")' },
      runQuery
    );

    expect(getIds(rows)).toEqual(['host:g2']);
  });

  it('fails when there are more of them than a page can be built from', async () => {
    const runQuery = createRunner({
      withAliases: Array.from({ length: 9_997 }, (_, i) => row(`host:${i}`, null)),
    });

    await expect(fetchSorted({ ...ARGS, pageSize: 3 }, runQuery)).rejects.toThrow(
      'Too many groups'
    );
  });

  it('merges the resolved entities with aliases and the others in the order of the sort', async () => {
    const runQuery = createRunner({
      withAliases: [row('host:g1', 'medium_impact'), row('host:g2', 'low_impact')],
      others: [row('host:e1', 'low_impact'), row('host:e2', 'high_impact'), row('host:e3', null)],
    });

    // Criticality sorts by its label, so medium comes before low and high.
    expect(getIds(await fetchSorted(ARGS, runQuery))).toEqual([
      'host:g1',
      'host:e1',
      'host:g2',
      'host:e2',
      'host:e3',
    ]);
  });

  it('puts the rows without a value last in both directions, and breaks ties by entity id', async () => {
    const fetchIn = async (direction: 'asc' | 'desc') =>
      getIds(
        await fetchSorted(
          { ...ARGS, sort: { field: 'asset.criticality', direction } },
          createRunner({
            withAliases: [row('host:b', 'low_impact'), row('host:z', null)],
            others: [row('host:a', 'low_impact'), row('host:c', null)],
          })
        )
      );

    expect(await fetchIn('asc')).toEqual(['host:a', 'host:b', 'host:c', 'host:z']);
    expect(await fetchIn('desc')).toEqual(['host:a', 'host:b', 'host:c', 'host:z']);
  });

  it("replaces a resolved entity's own row with its row over the aliases", async () => {
    const runQuery = createRunner({
      withAliases: [row('host:g1', 'extreme_impact')],
      others: [row('host:g1', 'low_impact'), row('host:e1', 'low_impact')],
    });

    expect(await fetchSorted(ARGS, runQuery)).toEqual([
      row('host:e1', 'low_impact'),
      row('host:g1', 'extreme_impact'),
    ]);
  });

  it('cuts the rows to the limit and its extra row', async () => {
    const runQuery = createRunner({
      withAliases: [row('host:g1', 'medium_impact'), row('host:g2', 'low_impact')],
      others: [row('host:e1', 'low_impact'), row('host:e2', 'low_impact')],
    });

    expect(getIds(await fetchSorted({ ...ARGS, pageSize: 2 }, runQuery))).toEqual([
      'host:g1',
      'host:e1',
      'host:e2',
    ]);
  });
});
