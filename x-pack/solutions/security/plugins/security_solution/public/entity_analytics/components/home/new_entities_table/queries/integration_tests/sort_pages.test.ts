/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityType } from '../../../../../../../common/entity_analytics/types';
import type { PageCursor, QueryArgs, Row, SortDir } from '../../common';
import { findSortPageFetcher } from '../../grid_columns';
import { toEsql } from '../../active_filters';
import type { ActiveFilters } from '../../active_filters';
import { EMPTY_ENTITY_FILTERS } from '../../hooks/use_entity_analytics_url_state';
import { SPLIT_SORT_MIN_VIEW_SIZE } from '../split_sort';
import type { EsqlRunner } from '../types';
import { BASE_ARGS, getIds, startFixtureCluster } from './fixture';
import type { FixtureCluster } from './fixture';

/** The general queries run below the threshold; the split plans at or above it. */
const VIEW_SIZES = { 'a small view': 10, 'a large view': SPLIT_SORT_MIN_VIEW_SIZE };

const fetchPage = (runQuery: EsqlRunner, args: QueryArgs, viewSize: number): Promise<Row[]> => {
  const fetchSortPage = findSortPageFetcher(args.sort.field);
  if (!fetchSortPage) throw new Error(`${args.sort.field} is not sortable`);
  return fetchSortPage(args, { runQuery, fetchViewSize: async () => viewSize });
};

const toCursor = (row: Row, { field, direction }: QueryArgs['sort']): PageCursor => {
  const value = row[field];
  return {
    sortField: field,
    sortDirection: direction,
    sortValue: typeof value === 'string' || typeof value === 'number' ? value : null,
    entityId: String(row['entity.id']),
  };
};

/** Every row from the cursor on, read a page of `pageSize` at a time like Load More does. */
const fetchAllPages = async (
  runQuery: EsqlRunner,
  args: QueryArgs,
  viewSize: number
): Promise<Row[]> => {
  const page = await fetchPage(runQuery, args, viewSize);
  const rows = page.slice(0, args.pageSize);
  // The page reads one row more than it shows: only then is there a next page.
  if (page.length <= args.pageSize) return rows;
  const cursor = toCursor(rows[rows.length - 1], args.sort);
  return [...rows, ...(await fetchAllPages(runQuery, { ...args, cursor }, viewSize))];
};

/** Expected resolved rows in order, per sort. */
const EXPECTED_ORDERS: ReadonlyArray<[string, SortDir, string[]]> = [
  [
    'entity.risk.calculated_score_norm',
    'desc',
    ['host:h1', 'user:alice@okta', 'host:h2', 'service:payments', 'host:h3', 'user:bob@okta'],
  ],
  [
    'entity.name',
    'asc',
    ['user:alice@okta', 'user:bob@okta', 'service:payments', 'host:h1', 'host:h2', 'host:h3'],
  ],
  [
    'alert_count',
    'desc',
    ['host:h1', 'user:alice@okta', 'host:h2', 'host:h3', 'service:payments', 'user:bob@okta'],
  ],
  [
    'alert_count',
    'asc',
    ['host:h3', 'service:payments', 'user:bob@okta', 'host:h2', 'user:alice@okta', 'host:h1'],
  ],
  [
    'last_seen_alert',
    'desc',
    ['host:h2', 'user:alice@okta', 'host:h1', 'host:h3', 'service:payments', 'user:bob@okta'],
  ],
  [
    'anomaly_count',
    'desc',
    ['user:alice@okta', 'host:h2', 'host:h1', 'host:h3', 'service:payments', 'user:bob@okta'],
  ],
  [
    'risk_score_change',
    'desc',
    ['host:h1', 'host:h2', 'user:alice@okta', 'host:h3', 'service:payments', 'user:bob@okta'],
  ],
  [
    'group_size',
    'desc',
    ['host:h1', 'user:bob@okta', 'host:h2', 'host:h3', 'service:payments', 'user:alice@okta'],
  ],
];

const NO_FILTERS: ActiveFilters = {
  search: {},
  entityFilters: EMPTY_ENTITY_FILTERS,
  tileEntityIds: null,
  rowsMode: 'resolved',
};

/** Rows a filter keeps, in each sort's order, compiled by the grid's own `toEsql`. */
const FILTER_CASES: ReadonlyArray<[string, Partial<ActiveFilters>, string, SortDir, string[]]> = [
  [
    'a search',
    { search: { esql: 'KQL("""entity.name: web*""")' } },
    'alert_count',
    'desc',
    ['host:h1', 'host:h2', 'host:h3'],
  ],
  [
    'a search',
    { search: { esql: 'KQL("""entity.name: web*""")' } },
    'group_size',
    'desc',
    ['host:h1', 'host:h2', 'host:h3'],
  ],
  [
    'an entity type filter',
    { entityFilters: { ...EMPTY_ENTITY_FILTERS, entityTypes: [EntityType.user] } },
    'group_size',
    'desc',
    ['user:bob@okta', 'user:alice@okta'],
  ],
  [
    'a criticality filter',
    { entityFilters: { ...EMPTY_ENTITY_FILTERS, assetCriticality: ['high_impact'] } },
    'alert_count',
    'desc',
    ['host:h1'],
  ],
  [
    'a watchlist filter',
    { entityFilters: { ...EMPTY_ENTITY_FILTERS, watchlists: ['wl-1'] } },
    'entity.risk.calculated_score_norm',
    'desc',
    ['host:h2'],
  ],
  [
    'a tile',
    { tileEntityIds: ['host:h2', 'user:alice@okta'] },
    'anomaly_count',
    'desc',
    ['user:alice@okta', 'host:h2'],
  ],
  [
    'individual rows',
    { rowsMode: 'individual' },
    'entity.risk.calculated_score_norm',
    'desc',
    [
      'host:h1',
      'user:alice@okta',
      'host:h2',
      'service:payments',
      'host:h3',
      'host:h4',
      'host:h5',
      'user:bob@okta',
      'user:carol@okta',
    ],
  ],
];

describe('entities grid sort pages on Elasticsearch', () => {
  let cluster: FixtureCluster;

  beforeAll(async () => {
    cluster = await startFixtureCluster();
  }, 300_000);

  afterAll(async () => {
    await cluster?.stop();
  });

  describe.each(Object.entries(VIEW_SIZES))('on %s', (_view, viewSize) => {
    it.each(EXPECTED_ORDERS)('sorts by %s %s', async (field, direction, expected) => {
      const rows = await fetchPage(
        cluster.runQuery,
        { ...BASE_ARGS, sort: { field, direction } },
        viewSize
      );

      expect(getIds(rows)).toEqual(expected);
    });

    it.each(EXPECTED_ORDERS)(
      'reads the same %s %s order two rows at a time',
      async (field, direction, expected) => {
        const rows = await fetchAllPages(
          cluster.runQuery,
          { ...BASE_ARGS, sort: { field, direction }, pageSize: 2 },
          viewSize
        );

        expect(getIds(rows)).toEqual(expected);
      }
    );

    it.each(FILTER_CASES)(
      'keeps the rows of %s, sorted by %s %s',
      async (_name, filters, field, direction, expected) => {
        const activeFilters = { ...NO_FILTERS, ...filters };
        const rows = await fetchPage(
          cluster.runQuery,
          {
            ...BASE_ARGS,
            ...toEsql(activeFilters),
            rowsMode: activeFilters.rowsMode,
            sort: { field, direction },
          },
          viewSize
        );

        expect(getIds(rows)).toEqual(expected);
      }
    );
  });
});
