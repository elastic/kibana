/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryArgs, Row } from './common';
import { findSortPageFetcher } from './grid_columns';

const ARGS: QueryArgs = {
  namespace: 'default',
  timeRange: '7d',
  sort: { field: 'entity.name', direction: 'asc' },
  pageSize: 25,
  rowsMode: 'resolved',
  concreteEntityIndexName: '.entities.v2.latest.default-00001',
  anomalyJobIds: [],
};

const SORTED_ROW: Row = {
  'entity.id': 'host:a',
  'entity.name': 'a',
  'asset.criticality': 'low_impact',
};
const RESOLVED_ENTITY_VALUES: Row = {
  'entity.id': 'host:a',
  'asset.criticality': 'extreme_impact',
};

/** Answers the read of the values of the resolved entities, and the sort query otherwise. */
const createContext = () => {
  const runQuery = jest.fn(
    async (steps: readonly string[]): Promise<Row[]> =>
      steps.join('\n').includes('alias_rank') ? [RESOLVED_ENTITY_VALUES] : [SORTED_ROW]
  );
  return { runQuery, ctx: { runQuery } };
};

describe('findSortPageFetcher', () => {
  it('gives the rows of a sort the values of their resolved entities', async () => {
    const { ctx } = createContext();

    const rows = await findSortPageFetcher('entity.name')?.(ARGS, ctx);

    expect(rows).toEqual([{ ...SORTED_ROW, 'asset.criticality': 'extreme_impact' }]);
  });

  it('leaves individual rows as the sort read them', async () => {
    const { runQuery, ctx } = createContext();

    const rows = await findSortPageFetcher('entity.name')?.(
      { ...ARGS, rowsMode: 'individual' },
      ctx
    );

    expect(rows).toEqual([SORTED_ROW]);
    expect(runQuery).toHaveBeenCalledTimes(1);
  });

  it('has no fetcher for a column that cannot be sorted', () => {
    expect(findSortPageFetcher('entity.relationships.resolution.resolved_to')).toBeUndefined();
  });
});
