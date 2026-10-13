/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryArgs, Row } from '../common';
import { buildGroupValuesQuery, withGroupValues } from './group_values';

const ARGS: QueryArgs = {
  namespace: 'default',
  timeRange: '7d',
  sort: { field: 'entity.name', direction: 'desc' },
  cursor: null,
  pageSize: 25,
  rowsMode: 'resolved',
  concreteEntityIndexName: '.entities.v2.latest.default-00001',
  anomalyJobIds: [],
};

const row = (id: string, extra: Row = {}): Row => ({ 'entity.id': id, ...extra });

describe('buildGroupValuesQuery', () => {
  it('reads the aliases of the targets, then joins the targets own values in', () => {
    expect(buildGroupValuesQuery(ARGS, ['host:a', 'host:b'])).toMatchSnapshot();
  });
});

describe('withGroupValues', () => {
  const GROUP_VALUES = row('host:a', {
    'asset.criticality': 'extreme_impact',
    'entity.source': ['aws', 'okta'],
  });

  it("gives a row the values of its group, and keeps its other fields and the other rows' as they are", async () => {
    const runQuery = jest.fn(async () => [GROUP_VALUES]);

    const rows = await withGroupValues(
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
    const runQuery = jest.fn(async () => []);

    await withGroupValues([row('host:a'), row('host:b')], ARGS, runQuery);

    expect(runQuery).toHaveBeenCalledTimes(1);
    expect(runQuery).toHaveBeenCalledWith(expect.stringContaining('IN ("host:a", "host:b")'));
  });

  it('splits a long list of rows into several queries', async () => {
    const runQuery = jest.fn(async () => []);
    const manyRows = Array.from({ length: 2_001 }, (_, i) => row(`host:${i}`));

    await withGroupValues(manyRows, ARGS, runQuery);

    expect(runQuery).toHaveBeenCalledTimes(2);
  });

  it('leaves individual rows as they are, without a query', async () => {
    const runQuery = jest.fn(async () => [GROUP_VALUES]);
    const individualRows = [row('host:a', { 'asset.criticality': 'low_impact' })];

    const rows = await withGroupValues(
      individualRows,
      { ...ARGS, rowsMode: 'individual' },
      runQuery
    );

    expect(rows).toBe(individualRows);
    expect(runQuery).not.toHaveBeenCalled();
  });

  it('does not query without rows', async () => {
    const runQuery = jest.fn(async () => []);

    expect(await withGroupValues([], ARGS, runQuery)).toEqual([]);
    expect(runQuery).not.toHaveBeenCalled();
  });
});
