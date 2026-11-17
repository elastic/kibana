/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EMPTY_ENTITY_FILTERS } from '../../common';
import type { QueryArgs } from '../../common';
import { findSortPageFetcher } from '../../grid_columns';
import { toDsl, toEsql } from '../../active_filters';
import type { ActiveFilters } from '../../active_filters';
import { joinAnd } from '../esql';
import { buildGroupValueBucketExpression } from '../entity_filters';
import { buildGroupValueBucketsQuery } from '../group_value_filters';
import {
  applyResolvedEntityFilterOverrides,
  applyResolvedEntityFilterOverridesToQuery,
  fetchResolvedEntityFilterOverrides,
} from '../resolved_entities';
import { fetchResolvedValueGroups } from '../resolved_value_groups';
import { BASE_ARGS, getIds, startFixtureCluster } from './fixture';
import type { FixtureCluster } from './fixture';

const NO_FILTERS: ActiveFilters = {
  search: {},
  entityFilters: EMPTY_ENTITY_FILTERS,
  tileEntityIds: null,
  rowsMode: 'resolved',
};

const WEB_SEARCH: Partial<ActiveFilters> = {
  search: { esql: 'KQL("""entity.name: web*""")' },
};

/** host:h1 is extreme_impact only through its alias host:h4. */
const EXTREME_FILTER: Partial<ActiveFilters> = {
  entityFilters: { ...EMPTY_ENTITY_FILTERS, assetCriticality: ['extreme_impact'] },
};

/** The rows each bucket holds, by the values the rows show; `null` keys the "no value" bucket. */
type ExpectedBuckets = Record<string, string[]>;
const NULL_BUCKET = 'null';

type GroupCase = [name: string, Partial<ActiveFilters>, field: string, ExpectedBuckets];

/*
 * Resolved rows show their group's values: host:h1 (with aliases host:h4 and host:h5) is
 * extreme_impact, on aws, gcp and okta, and on wl-2 and wl-3. Its own doc is high_impact, on okta.
 */
const GROUP_CASES: readonly GroupCase[] = [
  [
    'no filters',
    {},
    'asset.criticality',
    {
      extreme_impact: ['host:h1'],
      medium_impact: ['host:h2'],
      low_impact: ['user:alice@okta'],
      unassigned: ['host:h3', 'service:payments', 'user:bob@okta'],
    },
  ],
  [
    'no filters',
    {},
    'entity.source',
    {
      aws: ['host:h1'],
      gcp: ['host:h1'],
      okta: ['host:h1'],
      [NULL_BUCKET]: ['host:h2', 'host:h3', 'service:payments', 'user:alice@okta', 'user:bob@okta'],
    },
  ],
  [
    'no filters',
    {},
    'entity.attributes.watchlists',
    {
      'wl-1': ['host:h2'],
      'wl-2': ['host:h1'],
      'wl-3': ['host:h1'],
      [NULL_BUCKET]: ['host:h3', 'service:payments', 'user:alice@okta', 'user:bob@okta'],
    },
  ],
  [
    'no filters',
    {},
    'entity.risk.calculated_level',
    {
      Critical: ['host:h1'],
      High: ['user:alice@okta', 'user:bob@okta'],
      Moderate: ['host:h2'],
      // service:payments stores Unknown, host:h3 has no level: they are different buckets.
      Unknown: ['service:payments'],
      [NULL_BUCKET]: ['host:h3'],
    },
  ],
  [
    'a search',
    WEB_SEARCH,
    'asset.criticality',
    { extreme_impact: ['host:h1'], medium_impact: ['host:h2'], unassigned: ['host:h3'] },
  ],
  [
    'a search',
    WEB_SEARCH,
    'entity.source',
    {
      aws: ['host:h1'],
      gcp: ['host:h1'],
      okta: ['host:h1'],
      [NULL_BUCKET]: ['host:h2', 'host:h3'],
    },
  ],
  ['an entity filter', EXTREME_FILTER, 'asset.criticality', { extreme_impact: ['host:h1'] }],
  [
    'an entity filter',
    EXTREME_FILTER,
    'entity.attributes.watchlists',
    { 'wl-2': ['host:h1'], 'wl-3': ['host:h1'] },
  ],
];

const toBucketValue = (key: string): string | null => (key === NULL_BUCKET ? null : key);

describe('Group by resolved rows on Elasticsearch', () => {
  let cluster: FixtureCluster;

  beforeAll(async () => {
    cluster = await startFixtureCluster();
  }, 300_000);

  afterAll(async () => {
    await cluster?.stop();
  });

  /** The grid's query arguments for these filters, with the overrides the grid reads. */
  const getViewArgs = async (activeFilters: ActiveFilters): Promise<QueryArgs> => {
    const args = { ...BASE_ARGS, ...toEsql(activeFilters) };
    return {
      ...args,
      entityExpression:
        args.entityExpression &&
        applyResolvedEntityFilterOverrides(
          args.entityExpression,
          await fetchResolvedEntityFilterOverrides(args, cluster.runQuery)
        ),
    };
  };

  /** The ids of the rows the leaf grid of a bucket lists. */
  const fetchLeafIds = async (
    activeFilters: ActiveFilters,
    field: string,
    value: string | null
  ): Promise<unknown[]> => {
    const { entityExpression } = toEsql(activeFilters);
    const leafFilters = {
      ...BASE_ARGS,
      searchExpression: activeFilters.search.esql,
      entityExpression: joinAnd(entityExpression, buildGroupValueBucketExpression(field, value)),
    };
    const args = {
      ...leafFilters,
      sort: { field: 'entity.name', direction: 'asc' as const },
      entityExpression:
        leafFilters.entityExpression &&
        applyResolvedEntityFilterOverrides(
          leafFilters.entityExpression,
          await fetchResolvedEntityFilterOverrides(leafFilters, cluster.runQuery)
        ),
    };
    const fetchSortPage = findSortPageFetcher('entity.name');
    if (!fetchSortPage) throw new Error('entity.name is not sortable');
    return getIds(await fetchSortPage(args, { runQuery: cluster.runQuery })).sort();
  };

  describe.each(
    GROUP_CASES.map(([name, filters, field, expected]) => [name, field, filters, expected] as const)
  )('with %s, by %s', (_name, field, filters, expected) => {
    const activeFilters = { ...NO_FILTERS, ...filters };

    it('counts each bucket as the rows that show its value', async () => {
      const { buckets, total } = await fetchResolvedValueGroups(
        await getViewArgs(activeFilters),
        field,
        cluster.runQuery
      );

      expect(
        Object.fromEntries(buckets.map(({ value, count }) => [value ?? NULL_BUCKET, count]))
      ).toEqual(
        Object.fromEntries(Object.entries(expected).map(([key, ids]) => [key, ids.length]))
      );
      expect(total).toBe(new Set(Object.values(expected).flat()).size);
    });

    it('lists the rows that show the value of each bucket', async () => {
      for (const [key, ids] of Object.entries(expected)) {
        expect(await fetchLeafIds(activeFilters, field, toBucketValue(key))).toEqual(ids);
      }
    });
  });

  describe.each(
    GROUP_CASES.filter(([name]) => name === 'no filters').map(
      ([, , field, expected]) => [field, expected] as const
    )
  )('under a parent bucket by %s', (field, expected) => {
    it('keeps the entities that show the value of the parent bucket', async () => {
      for (const [key, ids] of Object.entries(expected)) {
        const value = toBucketValue(key);
        const overrides = await fetchResolvedEntityFilterOverrides(
          {
            ...BASE_ARGS,
            entityExpression: buildGroupValueBucketExpression(field, value),
          },
          cluster.runQuery
        );
        const query = {
          bool: {
            filter: [
              toDsl(NO_FILTERS) ?? {},
              ...applyResolvedEntityFilterOverridesToQuery(
                buildGroupValueBucketsQuery([{ field, value }]),
                overrides
              ),
            ],
          },
        };

        expect(await cluster.searchEntityIds(query)).toEqual(ids);
      }
    });
  });
});
