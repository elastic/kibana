/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryArgs, Row } from '../common';
import { withEntityAliases } from './resolved_entity_aliases';

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

const row = (id: string, resolvedTo?: string): Row => ({
  'entity.id': id,
  ...(resolvedTo ? { 'entity.relationships.resolution.resolved_to': resolvedTo } : {}),
});

describe('withEntityAliases', () => {
  it('adds the aliases of the rows after them', async () => {
    const alias = row('host:a1', 'host:a');
    const runQuery = jest.fn(async (_query: string) => [alias]);
    const rows = [row('host:a'), row('host:b')];

    expect(await withEntityAliases(rows, ARGS, runQuery)).toEqual([...rows, alias]);
    expect(runQuery).toHaveBeenCalledTimes(1);
    expect(runQuery).toHaveBeenCalledWith(expect.stringContaining('IN ("host:a", "host:b")'));
  });

  it('leaves individual rows as they are, without a query', async () => {
    const runQuery = jest.fn(async (_query: string): Promise<Row[]> => []);
    const rows = [row('host:a')];

    expect(await withEntityAliases(rows, { ...ARGS, rowsMode: 'individual' }, runQuery)).toBe(rows);
    expect(runQuery).not.toHaveBeenCalled();
  });

  it('does not query without rows', async () => {
    const runQuery = jest.fn(async (_query: string): Promise<Row[]> => []);

    expect(await withEntityAliases([], ARGS, runQuery)).toEqual([]);
    expect(runQuery).not.toHaveBeenCalled();
  });

  it('fails when the aliases are more than the query of the read can list', async () => {
    const runQuery = jest.fn(async (_query: string) =>
      Array.from({ length: 2_001 }, (_, i) => row(`host:a${i}`, 'host:a'))
    );

    await expect(withEntityAliases([row('host:a')], ARGS, runQuery)).rejects.toThrow(
      'too many aliases'
    );
  });
});
