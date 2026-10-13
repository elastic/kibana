/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { EntityType } from '../../../../../../../common/entity_analytics/types';
import { RiskSeverity } from '../../../../../../../common/search_strategy';
import { EMPTY_ENTITY_FILTERS } from '../../common';
import type { PageCursor, QueryArgs, Row, SortDir } from '../../common';
import { COLUMN_ENRICHERS, findSortPageFetcher } from '../../grid_columns';
import { toEsql } from '../../active_filters';
import type { ActiveFilters } from '../../active_filters';
import { withGroupValues } from '../group_values';
import { SPLIT_SORT_MIN_VIEW_SIZE } from '../split_sort';
import type { EsqlRunner } from '../types';
import { BASE_ARGS, getIds, hoursAgo, startFixtureCluster } from './fixture';
import { DAY_MS, HOUR_MS } from './fixture/fixture_index';
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
    // user:bob@okta has no score of its own, but its group's score is 85.
    ['host:h1', 'user:bob@okta', 'user:alice@okta', 'host:h2', 'service:payments', 'host:h3'],
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

/** A filter case: what it sets, the sort it runs with and the rows it keeps in order. */
type FilterCase = [name: string, Partial<ActiveFilters>, field: string, SortDir, string[]];

const WEB_SEARCH = { search: { esql: 'KQL("""entity.name: web*""")' } };

const SEARCH_CASES: readonly FilterCase[] = [
  ['a name search', WEB_SEARCH, 'alert_count', 'desc', ['host:h1', 'host:h2', 'host:h3']],
  ['a name search', WEB_SEARCH, 'group_size', 'desc', ['host:h1', 'host:h2', 'host:h3']],
];

const FILTER_CASES: readonly FilterCase[] = [
  [
    'an entity type filter',
    { entityFilters: { ...EMPTY_ENTITY_FILTERS, entityTypes: [EntityType.user] } },
    'group_size',
    'desc',
    ['user:bob@okta', 'user:alice@okta'],
  ],
  [
    'a risk level filter',
    { entityFilters: { ...EMPTY_ENTITY_FILTERS, riskLevels: [RiskSeverity.Critical] } },
    'entity.name',
    'asc',
    ['host:h1'],
  ],
  [
    // user:bob@okta is High through its group's level, user:alice@okta through its own.
    'a risk level filter on the level of the group',
    { entityFilters: { ...EMPTY_ENTITY_FILTERS, riskLevels: [RiskSeverity.High] } },
    'entity.name',
    'asc',
    ['user:alice@okta', 'user:bob@okta'],
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
];

const VIEW_BY_CASES: readonly FilterCase[] = [
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

describe('entities grid on Elasticsearch', () => {
  let cluster: FixtureCluster;

  beforeAll(async () => {
    cluster = await startFixtureCluster();
  }, 300_000);

  afterAll(async () => {
    await cluster?.stop();
  });

  describe.each(Object.entries(VIEW_SIZES))('on %s', (_view, viewSize) => {
    /** The page of a filter case, its filters compiled by the grid's own `toEsql`. */
    const fetchFilteredPage = ([, filters, field, direction]: FilterCase): Promise<Row[]> => {
      const activeFilters = { ...NO_FILTERS, ...filters };
      return fetchPage(
        cluster.runQuery,
        {
          ...BASE_ARGS,
          ...toEsql(activeFilters),
          rowsMode: activeFilters.rowsMode,
          sort: { field, direction },
        },
        viewSize
      );
    };

    describe('sorts', () => {
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
    });

    describe.each([
      ['search', SEARCH_CASES],
      ['filters', FILTER_CASES],
      ['view by', VIEW_BY_CASES],
    ] as const)('%s', (_name, cases) => {
      it.each(cases)('keeps the rows of %s, sorted by %s %s', async (...filterCase) => {
        const rows = await fetchFilteredPage(filterCase);

        expect(getIds(rows)).toEqual(filterCase[4]);
      });
    });
  });

  describe('the values of the groups', () => {
    const fetchGroupRows = async (ids: string[]): Promise<Map<unknown, Row>> => {
      const rows = await withGroupValues(
        ids.map((id) => ({ 'entity.id': id })),
        BASE_ARGS,
        cluster.runQuery
      );
      return new Map(rows.map((row) => [row['entity.id'], row]));
    };

    it('shows the highest criticality, the distinct sources and watchlists, and the first and last time seen of the members', async () => {
      const { 'host:h1': group } = Object.fromEntries(await fetchGroupRows(['host:h1']));

      expect(group['asset.criticality']).toBe('extreme_impact');
      expect([group['entity.source']].flat().sort()).toEqual(['aws', 'gcp', 'okta']);
      expect([group['entity.attributes.watchlists']].flat().sort()).toEqual(['wl-2', 'wl-3']);
      // host:h4 was first seen 40 days ago, and last seen half an hour ago.
      expect(Date.now() - Date.parse(String(group['entity.lifecycle.first_seen']))).toBeGreaterThan(
        39 * DAY_MS
      );
      expect(Date.now() - Date.parse(String(group['@timestamp']))).toBeLessThan(HOUR_MS * 0.75);
    });

    it('leaves a row without aliases as it is', async () => {
      const rows = await fetchGroupRows(['host:h2']);

      expect(rows.get('host:h2')).toEqual({ 'entity.id': 'host:h2' });
    });

    it('has no value for a group in which no member has one', async () => {
      const rows = await fetchGroupRows(['user:bob@okta']);

      expect(rows.get('user:bob@okta')).toMatchObject({
        'asset.criticality': null,
        'entity.source': null,
        'entity.attributes.watchlists': null,
      });
    });
  });

  describe('column values', () => {
    /** The values a column's enricher fetches for the page rows of the default sort. */
    const fetchColumnValues = async (
      columnId: string,
      rowsMode: QueryArgs['rowsMode'] = 'resolved'
    ): Promise<Record<string, Row>> => {
      const args = { ...BASE_ARGS, rowsMode };
      const rows = await fetchPage(cluster.runQuery, args, 0);
      const enricher = COLUMN_ENRICHERS.find(([id]) => id === columnId)?.[1];
      if (!enricher) throw new Error(`${columnId} has no enricher`);
      const fields = await enricher.fetch(rows, args, {
        runQuery: cluster.runQuery,
        http: httpServiceMock.createSetupContract(),
      });
      return Object.fromEntries(fields);
    };

    const NO_ALERTS = {
      alert_count: 0,
      alert_critical: 0,
      alert_high: 0,
      alert_medium: 0,
      alert_low: 0,
      last_seen_alert: null,
    };

    it('counts the open alerts in the window per severity, with the last one', async () => {
      expect(await fetchColumnValues('alert_count')).toEqual({
        'host:h1': {
          ...NO_ALERTS,
          alert_count: 3,
          alert_critical: 1,
          alert_high: 2,
          last_seen_alert: hoursAgo(cluster.now, 3),
        },
        'host:h2': {
          ...NO_ALERTS,
          alert_count: 1,
          alert_low: 1,
          last_seen_alert: hoursAgo(cluster.now, 1),
        },
        'host:h3': NO_ALERTS,
        'service:payments': NO_ALERTS,
        'user:alice@okta': {
          ...NO_ALERTS,
          alert_count: 2,
          alert_medium: 2,
          last_seen_alert: hoursAgo(cluster.now, 2),
        },
        'user:bob@okta': NO_ALERTS,
      });
    });

    it('counts the anomaly records of the installed jobs', async () => {
      expect(await fetchColumnValues('anomaly_count')).toEqual({
        'host:h1': { anomaly_count: null },
        'host:h2': { anomaly_count: 1 },
        'host:h3': { anomaly_count: null },
        'service:payments': { anomaly_count: null },
        'user:alice@okta': { anomaly_count: 2 },
        'user:bob@okta': { anomaly_count: null },
      });
    });

    it.each(Object.entries(VIEW_SIZES))(
      'gives an entity the same anomaly count sorted by it as enriched, on %s',
      async (_view, viewSize) => {
        const sorted = await fetchAllPages(
          cluster.runQuery,
          { ...BASE_ARGS, sort: { field: 'anomaly_count', direction: 'desc' } },
          viewSize
        );
        const enriched = await fetchColumnValues('anomaly_count');
        expect(
          Object.fromEntries(sorted.map((row) => [row['entity.id'], row.anomaly_count]))
        ).toEqual(
          Object.fromEntries(Object.entries(enriched).map(([id, { anomaly_count: n }]) => [id, n]))
        );
      }
    );

    it('sizes each group with its records', async () => {
      expect(await fetchColumnValues('group_size')).toEqual({
        'host:h1': { group_size: 3 },
        'host:h2': { group_size: 1 },
        'host:h3': { group_size: 1 },
        'service:payments': { group_size: 1 },
        'user:alice@okta': { group_size: 1 },
        'user:bob@okta': { group_size: 2 },
      });
    });

    it('sizes an alias as a single record in individual rows', async () => {
      expect(await fetchColumnValues('group_size', 'individual')).toMatchObject({
        'host:h1': { group_size: 3 },
        'host:h4': { group_size: 1 },
        'user:carol@okta': { group_size: 1 },
      });
    });

    it("changes the risk score of a group from the group's last score before the window", async () => {
      // host:h1's score is 95 now and its group's was 80, while its own was 60.
      expect(await fetchColumnValues('risk_score_change')).toEqual({
        'host:h1': { risk_score_change: 15 },
        'host:h2': { risk_score_change: 0 },
        'host:h3': { risk_score_change: null },
        'service:payments': { risk_score_change: null },
        'user:alice@okta': { risk_score_change: -10 },
        'user:bob@okta': { risk_score_change: null },
      });
    });

    it('changes the risk score of an entity from its own last score in individual rows', async () => {
      expect(await fetchColumnValues('risk_score_change', 'individual')).toMatchObject({
        'host:h1': { risk_score_change: 30 },
        'host:h2': { risk_score_change: 0 },
        'user:alice@okta': { risk_score_change: -10 },
      });
    });
  });
});
