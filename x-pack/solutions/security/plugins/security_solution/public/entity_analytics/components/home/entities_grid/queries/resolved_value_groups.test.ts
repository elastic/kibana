/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildResolvedValueBuckets } from './resolved_entities';
import { ESQL_MAX_RESULT_ROWS } from './esql';
import { fetchResolvedValueGroups } from './resolved_value_groups';

const ARGS = { namespace: 'default', concreteEntityIndexName: '.entities.v2.latest.default-00001' };

describe('buildResolvedValueBuckets', () => {
  it("moves the counts from the main entities' own values to the group's", () => {
    expect(
      buildResolvedValueBuckets({
        field: 'asset.criticality',
        ownCounts: [
          { value: 'high_impact', count: 1 },
          { value: 'low_impact', count: 2 },
        ],
        changes: [
          { field: 'asset.criticality', value: 'extreme_impact', change: 1 },
          { field: 'asset.criticality', value: 'high_impact', change: -1 },
          // Changes of other fields don't count.
          { field: 'entity.source', value: 'low_impact', change: 5 },
        ],
      })
    ).toEqual([
      { value: 'low_impact', count: 2 },
      { value: 'extreme_impact', count: 1 },
    ]);
  });

  it('counts a missing criticality as unassigned', () => {
    expect(
      buildResolvedValueBuckets({
        field: 'asset.criticality',
        ownCounts: [
          { value: null, count: 3 },
          { value: 'unassigned', count: 1 },
        ],
        changes: [{ field: 'asset.criticality', value: null, change: -1 }],
      })
    ).toEqual([{ value: 'unassigned', count: 3 }]);
  });

  it('keeps the "no value" bucket of other fields, last among equal counts', () => {
    expect(
      buildResolvedValueBuckets({
        field: 'entity.source',
        ownCounts: [
          { value: null, count: 2 },
          { value: 'okta', count: 2 },
          { value: 'aws', count: 2 },
        ],
        changes: [],
      })
    ).toEqual([
      { value: 'aws', count: 2 },
      { value: 'okta', count: 2 },
      { value: null, count: 2 },
    ]);
  });

  it('clamps at 0 and drops empty buckets', () => {
    expect(
      buildResolvedValueBuckets({
        field: 'entity.attributes.watchlists',
        ownCounts: [{ value: 'wl-1', count: 1 }],
        changes: [{ field: 'entity.attributes.watchlists', value: 'wl-1', change: -2 }],
      })
    ).toEqual([]);
  });
});

describe('fetchResolvedValueGroups', () => {
  const runQuery = jest.fn();

  beforeEach(() => {
    runQuery.mockReset();
    runQuery.mockImplementation(async (steps: string[]) => {
      const query = steps.join('\n');
      if (query.includes('STATS total')) return [{ total: 4 }];
      if (query.includes('BY group_value')) {
        return [
          { group_value: 'okta', n: 2 },
          { group_value: null, n: 2 },
        ];
      }
      if (query.includes('FORK')) {
        return [
          { change_field: 'entity.source', change_value: 'aws', change: 1 },
          { change_field: 'entity.source', change_value: null, change: -1 },
        ];
      }
      return [];
    });
  });

  it('merges the own counts with the changes of the resolved entities in view', async () => {
    await expect(fetchResolvedValueGroups(ARGS, 'entity.source', runQuery)).resolves.toEqual({
      buckets: [
        { value: 'okta', count: 2 },
        { value: 'aws', count: 1 },
        { value: null, count: 1 },
      ],
      total: 4,
      isTruncated: false,
    });
  });

  it('keeps every value of a field with more than 200 of them', async () => {
    runQuery.mockImplementation(async (steps: string[]) => {
      const query = steps.join('\n');
      if (query.includes('STATS total')) return [{ total: 250 }];
      if (query.includes('BY group_value')) {
        return Array.from({ length: 250 }, (_, i) => ({ group_value: `wl-${i}`, n: 1 }));
      }
      return [];
    });
    const { buckets, isTruncated } = await fetchResolvedValueGroups(
      ARGS,
      'entity.attributes.watchlists',
      runQuery
    );

    expect(buckets).toHaveLength(250);
    expect(isTruncated).toBe(false);
  });

  it('reports a read that hit the row limit', async () => {
    runQuery.mockImplementation(async (steps: string[]) =>
      steps.join('\n').includes('BY group_value')
        ? Array.from({ length: ESQL_MAX_RESULT_ROWS }, (_, i) => ({ group_value: `v-${i}`, n: 1 }))
        : []
    );

    await expect(
      fetchResolvedValueGroups(ARGS, 'entity.attributes.watchlists', runQuery)
    ).resolves.toEqual(expect.objectContaining({ isTruncated: true }));
  });

  it('counts the in-view rows with the search and the entity filters', async () => {
    await fetchResolvedValueGroups(
      { ...ARGS, searchExpression: 'KQL("x")', entityExpression: 'entity.source IS NULL' },
      'entity.source',
      runQuery
    );
    const ownCountsQuery = runQuery.mock.calls
      .map(([steps]) => steps.join('\n'))
      .find((query) => query.includes('BY group_value'));

    expect(ownCountsQuery).toContain('| WHERE KQL("x")');
    expect(ownCountsQuery).toContain('| WHERE entity.source IS NULL');
    expect(ownCountsQuery).toContain('entity.relationships.resolution.resolved_to IS NULL');
  });

  it('reads no changes for risk level, whose group value is stored on the main entity', async () => {
    await fetchResolvedValueGroups(ARGS, 'entity.risk.calculated_level', runQuery);
    const queries = runQuery.mock.calls.map(([steps]) => steps.join('\n'));

    expect(queries.some((query) => query.includes('FORK'))).toBe(false);
    expect(queries.join('\n')).toContain(
      'BY group_value = COALESCE(entity.relationships.resolution.risk.calculated_level, entity.risk.calculated_level)'
    );
  });
});
