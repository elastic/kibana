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

/** A fake runner that answers each native sort query from the given rows. */
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
    if (query.includes('resolved_to IS NOT NULL')) {
      const targetIds = query.match(/resolved_to IN \(([^)]*)\)/)?.[1];
      return targetIds == null
        ? withAliases
        : withAliases.filter((group) => targetIds.includes(`"${group['entity.id']}"`));
    }
    if (query.includes('| KEEP `entity.id`')) return searched.map((id) => ({ 'entity.id': id }));
    const level = query.match(/asset\.criticality == "([^"]+)"/)?.[1] ?? null;
    return others.filter((other) => other['asset.criticality'] === level);
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

  it('reads only the groups the search matches, however many groups there are', async () => {
    const runQuery = createRunner({
      withAliases: Array.from({ length: 9_997 }, (_, i) => row(`host:${i}`, null)),
      searched: ['host:42'],
    });

    const rows = await fetchSorted(
      { ...ARGS, pageSize: 3, searchExpression: 'KQL("""entity.name: web*""")' },
      runQuery
    );

    expect(getIds(rows)).toEqual(['host:42']);
  });

  it('checks the matches apart when the search matches too many resolved entities to read by id', async () => {
    const runQuery = createRunner({
      withAliases: [row('host:g1', 'low_impact'), row('host:g2', 'low_impact')],
      searched: Array.from({ length: 9_997 }, (_, i) => `host:${i}`).concat('host:g2'),
    });

    const rows = await fetchSorted(
      { ...ARGS, pageSize: 3, searchExpression: 'KQL("""entity.name: web*""")' },
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

    // Criticality sorts by its rank: high, medium, low, then unassigned.
    expect(getIds(await fetchSorted(ARGS, runQuery))).toEqual([
      'host:e2',
      'host:g1',
      'host:e1',
      'host:g2',
      'host:e3',
    ]);
  });

  it('sorts unassigned criticality as the lowest, and breaks ties by entity id', async () => {
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

    expect(await fetchIn('asc')).toEqual(['host:c', 'host:z', 'host:a', 'host:b']);
    expect(await fetchIn('desc')).toEqual(['host:a', 'host:b', 'host:c', 'host:z']);
  });

  it("replaces a resolved entity's own row with its row over the aliases", async () => {
    const runQuery = createRunner({
      withAliases: [row('host:g1', 'extreme_impact')],
      others: [row('host:g1', 'low_impact'), row('host:e1', 'low_impact')],
    });

    expect(await fetchSorted(ARGS, runQuery)).toEqual([
      row('host:g1', 'extreme_impact'),
      row('host:e1', 'low_impact'),
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

describe('sorting resolved rows by risk score', () => {
  it("merges the main entities' resolved scores with the others' own scores", async () => {
    const score = (id: string, value: number): Row => ({
      'entity.id': id,
      'entity.risk.calculated_score_norm': value,
    });
    const runQuery = jest.fn(
      async (steps: readonly string[]): Promise<Row[]> =>
        steps.join('\n').includes('resolution.risk.calculated_score_norm IS NOT NULL')
          ? [score('host:g1', 90), score('host:g2', 40)]
          : [score('host:e1', 70), score('host:e2', 40), score('host:e3', 10)]
    );

    const rows = await fetchSorted(
      {
        ...ARGS,
        sort: { field: 'entity.risk.calculated_score_norm', direction: 'desc' },
        pageSize: 3,
      },
      runQuery
    );

    expect(getIds(rows)).toEqual(['host:g1', 'host:e1', 'host:e2', 'host:g2']);
    expect(runQuery).toHaveBeenCalledTimes(2);
  });
});
