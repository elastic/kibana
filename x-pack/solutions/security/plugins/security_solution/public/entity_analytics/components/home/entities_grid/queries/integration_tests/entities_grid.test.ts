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
import type { QueryArgs, Row, SortDir } from '../../common';
import { QUERY_SPECS, findSortPageFetcher } from '../../grid_columns';
import { toDsl, toEsql } from '../../active_filters';
import type { ActiveFilters } from '../../active_filters';
import {
  applyResolvedEntityFilterOverrides,
  fetchResolvedEntityFilterOverrides,
  fetchResolvedEntityValueChanges,
  withResolvedEntityValues,
} from '../resolved_entities';
import type { ResolvedEntityValueChange } from '../resolved_entities';
import { buildAlertSortAllQuery } from '../alerts';
import { buildEntitiesInViewCountQuery } from '../entities_in_view';
import type { EsqlRunner } from '../types';
import { BASE_ARGS, getIds, hoursAgo, startFixtureCluster } from './fixture';
import { DAY_MS, HOUR_MS } from './fixture/fixture_index';
import type { FixtureCluster } from './fixture';

const fetchPage = (runQuery: EsqlRunner, args: QueryArgs): Promise<Row[]> => {
  const fetchSortPage = findSortPageFetcher(args.sort.field);
  if (!fetchSortPage) throw new Error(`${args.sort.field} is not sortable`);
  return fetchSortPage(args, { runQuery });
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
    ['host:h2', 'user:alice@okta', 'host:h1', 'host:h3', 'service:payments', 'user:bob@okta'],
  ],
  [
    'last_seen_alert',
    'desc',
    ['host:h1', 'host:h2', 'user:alice@okta', 'host:h3', 'service:payments', 'user:bob@okta'],
  ],
  [
    'anomaly_count',
    'desc',
    ['user:alice@okta', 'host:h1', 'host:h2', 'user:bob@okta', 'host:h3', 'service:payments'],
  ],
  [
    'anomaly_count',
    'asc',
    // Entities without anomalies have no value, so they come last in both directions.
    ['host:h1', 'host:h2', 'user:bob@okta', 'user:alice@okta', 'host:h3', 'service:payments'],
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
  [
    'group_size',
    'asc',
    // The entities alone in their group (1 record) come first, by entity id.
    ['host:h2', 'host:h3', 'service:payments', 'user:alice@okta', 'user:bob@okta', 'host:h1'],
  ],
  // By rank, unassigned last: host:h1 is extreme through an alias; host:h3, payments and bob are unassigned.
  [
    'asset.criticality',
    'desc',
    ['host:h1', 'host:h2', 'user:alice@okta', 'host:h3', 'service:payments', 'user:bob@okta'],
  ],
  [
    'asset.criticality',
    'asc',
    ['host:h3', 'service:payments', 'user:bob@okta', 'user:alice@okta', 'host:h2', 'host:h1'],
  ],
  // host:h1 was first seen 40 days ago through one of its aliases, and the others 20 days ago.
  [
    'entity.lifecycle.first_seen',
    'asc',
    ['host:h1', 'host:h2', 'host:h3', 'service:payments', 'user:alice@okta', 'user:bob@okta'],
  ],
  [
    'entity.lifecycle.first_seen',
    'desc',
    ['host:h2', 'host:h3', 'service:payments', 'user:alice@okta', 'user:bob@okta', 'host:h1'],
  ],
  // host:h1 was last seen half an hour ago through one of its aliases, and the others an hour ago.
  [
    '@timestamp',
    'desc',
    ['host:h1', 'host:h2', 'host:h3', 'service:payments', 'user:alice@okta', 'user:bob@okta'],
  ],
  [
    '@timestamp',
    'asc',
    ['host:h2', 'host:h3', 'service:payments', 'user:alice@okta', 'user:bob@okta', 'host:h1'],
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
  ['a name search', WEB_SEARCH, 'asset.criticality', 'desc', ['host:h1', 'host:h2', 'host:h3']],
  // host:h1 was first seen through its alias host:h4, 40 days ago; the others 20 days ago.
  [
    'a name search',
    WEB_SEARCH,
    'entity.lifecycle.first_seen',
    'asc',
    ['host:h1', 'host:h2', 'host:h3'],
  ],
  [
    // host:h1 is extreme impact through one of its aliases, not its own criticality.
    'a name search and a criticality filter on the group',
    {
      ...WEB_SEARCH,
      entityFilters: { ...EMPTY_ENTITY_FILTERS, assetCriticality: ['extreme_impact'] },
    },
    'asset.criticality',
    'desc',
    ['host:h1'],
  ],
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
    // host:h1 is high impact itself, and extreme through one of its aliases.
    'a criticality filter on the highest criticality of the group',
    { entityFilters: { ...EMPTY_ENTITY_FILTERS, assetCriticality: ['extreme_impact'] } },
    'alert_count',
    'desc',
    ['host:h1'],
  ],
  [
    'a criticality filter that the group does not pass, though its main entity does',
    { entityFilters: { ...EMPTY_ENTITY_FILTERS, assetCriticality: ['high_impact'] } },
    'alert_count',
    'desc',
    [],
  ],
  [
    // "Unassigned" is never stored: it is a group where no entity has a criticality.
    'an unassigned criticality filter',
    { entityFilters: { ...EMPTY_ENTITY_FILTERS, assetCriticality: ['unassigned'] } },
    'entity.name',
    'asc',
    ['user:bob@okta', 'service:payments', 'host:h3'],
  ],
  [
    'an unassigned criticality filter with a criticality level',
    {
      entityFilters: { ...EMPTY_ENTITY_FILTERS, assetCriticality: ['low_impact', 'unassigned'] },
    },
    'entity.name',
    'asc',
    ['user:alice@okta', 'user:bob@okta', 'service:payments', 'host:h3'],
  ],
  [
    'a watchlist filter on the watchlist of an alias',
    { entityFilters: { ...EMPTY_ENTITY_FILTERS, watchlists: ['wl-2'] } },
    'entity.name',
    'asc',
    ['host:h1'],
  ],
  [
    'a source filter on the source of an alias',
    { entityFilters: { ...EMPTY_ENTITY_FILTERS, dataSources: ['aws'] } },
    'group_size',
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

  describe('rows', () => {
    /** The query arguments of a filter case, its filters compiled by the grid's own `toEsql`. */
    const getFilteredArgs = async ([
      ,
      filters,
      field,
      direction,
    ]: FilterCase): Promise<QueryArgs> => {
      const activeFilters = { ...NO_FILTERS, ...filters };
      const args = {
        ...BASE_ARGS,
        ...toEsql(activeFilters),
        rowsMode: activeFilters.rowsMode,
        sort: { field, direction },
      };
      // The grid reads the groups the filters on the group values add or remove first.
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

    const fetchFilteredPage = async (filterCase: FilterCase): Promise<Row[]> =>
      fetchPage(cluster.runQuery, await getFilteredArgs(filterCase));

    describe('sorts', () => {
      it.each(EXPECTED_ORDERS)('sorts by %s %s', async (field, direction, expected) => {
        const rows = await fetchPage(cluster.runQuery, {
          ...BASE_ARGS,
          sort: { field, direction },
        });

        expect(getIds(rows)).toEqual(expected);
      });

      it.each(EXPECTED_ORDERS)(
        'reads the first rows of the %s %s order at every limit',
        async (field, direction, expected) => {
          // Each limit cuts at another place: in the value rows, the empty rows, or where they meet.
          for (let pageSize = 1; pageSize < expected.length; pageSize++) {
            const rows = await fetchPage(cluster.runQuery, {
              ...BASE_ARGS,
              sort: { field, direction },
              pageSize,
            });

            expect(getIds(rows)).toEqual(expected.slice(0, pageSize + 1));
          }
        }
      );

      it.each(EXPECTED_ORDERS.filter(([field]) => field === 'alert_count'))(
        'ranks every entity in view by %s %s like the value rows, with no alerts as null',
        async (field, direction, expected) => {
          const rows = await cluster.runQuery(
            buildAlertSortAllQuery({ ...BASE_ARGS, sort: { field, direction } })
          );

          expect(getIds(rows)).toEqual(expected);
          expect(rows.filter((row) => row.alert_count === 0)).toEqual([]);
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

      it.each(cases)('counts the rows of %s, sorted by %s %s', async (...filterCase) => {
        const [{ total }] = await cluster.runQuery(
          buildEntitiesInViewCountQuery(await getFilteredArgs(filterCase))
        );

        expect(total).toBe(filterCase[4].length);
      });
    });
  });

  describe('Group by', () => {
    it('reads the same entities as the grid, for a watchlist only an alias is on', async () => {
      // host:h1 isn't on wl-2 itself; its alias host:h4 is.
      const activeFilters: ActiveFilters = {
        ...NO_FILTERS,
        entityFilters: { ...EMPTY_ENTITY_FILTERS, watchlists: ['wl-2'] },
      };
      const args = { ...BASE_ARGS, ...toEsql(activeFilters) };
      const overrides = await fetchResolvedEntityFilterOverrides(args, cluster.runQuery);
      const gridIds = getIds(
        await fetchPage(cluster.runQuery, {
          ...args,
          entityExpression:
            args.entityExpression &&
            applyResolvedEntityFilterOverrides(args.entityExpression, overrides),
        })
      );

      expect(gridIds).toEqual(['host:h1']);
      expect(await cluster.searchEntityIds(toDsl(activeFilters, overrides) ?? {})).toEqual(gridIds);
    });
  });

  describe('the values of the groups', () => {
    const fetchGroupRows = async (ids: string[]): Promise<Map<unknown, Row>> => {
      const rows = await withResolvedEntityValues(
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

    describe("the counts of the groups' values", () => {
      /** The net change of each value the counts show, by field. */
      const getNetChanges = (changes: readonly ResolvedEntityValueChange[]) =>
        changes.reduce<Record<string, Record<string, number>>>((net, { field, value, change }) => {
          if (value == null) return net;
          const total = (net[field]?.[value] ?? 0) + change;
          const { [value]: _, ...others } = net[field] ?? {};
          return { ...net, [field]: total ? { ...others, [value]: total } : others };
        }, {});

      it("moves a group's count from its main entity's own values to the group's", async () => {
        const changes = await fetchResolvedEntityValueChanges(BASE_ARGS, cluster.runQuery);

        // host:h1 is high_impact on okta and on no watchlist; its aliases add the rest.
        expect(getNetChanges(changes)).toEqual({
          'asset.criticality': { extreme_impact: 1, high_impact: -1 },
          'entity.source': { aws: 1, gcp: 1 },
          'entity.attributes.watchlists': { 'wl-2': 1, 'wl-3': 1 },
        });
      });

      it('counts only the groups whose main entity the search matches', async () => {
        const changes = await fetchResolvedEntityValueChanges(
          { ...BASE_ARGS, searchExpression: 'KQL("""entity.name: bob""")' },
          cluster.runQuery
        );

        expect(getNetChanges(changes)).toEqual({});
      });
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
      const rows = await fetchPage(cluster.runQuery, args);
      const enricher = QUERY_SPECS[columnId as keyof typeof QUERY_SPECS]?.enricher;
      if (!enricher) throw new Error(`${columnId} has no enricher`);
      const fields = await enricher.fetch(rows, args, {
        runQuery: cluster.runQuery,
        http: httpServiceMock.createSetupContract(),
      });
      return Object.fromEntries(fields);
    };

    const NO_ALERTS = {
      alert_count: null,
      alert_critical: null,
      alert_high: null,
      alert_medium: null,
      alert_low: null,
      last_seen_alert: null,
    };

    const NO_SEVERITIES = { alert_critical: 0, alert_high: 0, alert_medium: 0, alert_low: 0 };

    it('counts the open alerts in the window per severity, with the last one', async () => {
      expect(await fetchColumnValues('alert_count')).toEqual({
        // The alerts of host:h1 and of its two aliases: host:h4 was last alerted half an hour ago.
        'host:h1': {
          ...NO_SEVERITIES,
          alert_count: 5,
          alert_critical: 2,
          alert_high: 2,
          alert_low: 1,
          last_seen_alert: hoursAgo(cluster.now, 0.5),
        },
        'host:h2': {
          ...NO_SEVERITIES,
          alert_count: 1,
          alert_low: 1,
          last_seen_alert: hoursAgo(cluster.now, 1),
        },
        'host:h3': NO_ALERTS,
        'service:payments': NO_ALERTS,
        'user:alice@okta': {
          ...NO_SEVERITIES,
          alert_count: 2,
          alert_medium: 2,
          last_seen_alert: hoursAgo(cluster.now, 2),
        },
        'user:bob@okta': NO_ALERTS,
      });
    });

    it('counts the anomaly records of the installed jobs, in a group those of its members', async () => {
      expect(await fetchColumnValues('anomaly_count')).toEqual({
        'host:h1': { anomaly_count: 1 },
        'host:h2': { anomaly_count: 1 },
        'host:h3': { anomaly_count: null },
        'service:payments': { anomaly_count: null },
        'user:alice@okta': { anomaly_count: 2 },
        'user:bob@okta': { anomaly_count: 1 },
      });
    });

    it('counts the alerts and anomalies of an entity alone in individual rows', async () => {
      expect(await fetchColumnValues('alert_count', 'individual')).toMatchObject({
        'host:h1': { alert_count: 3 },
        'host:h4': { alert_count: 1 },
        'host:h5': { alert_count: 1 },
      });
      expect(await fetchColumnValues('anomaly_count', 'individual')).toMatchObject({
        'host:h1': { anomaly_count: null },
        'host:h4': { anomaly_count: 1 },
      });
    });

    describe.each(['anomaly_count', 'alert_count', 'last_seen_alert'])('%s', (field) => {
      it('gives an entity the same value sorted by it as enriched', async () => {
        const sorted = await fetchPage(cluster.runQuery, {
          ...BASE_ARGS,
          sort: { field, direction: 'desc' },
        });
        // The alert count's enricher reads the last alert too.
        const enriched = await fetchColumnValues(
          field === 'last_seen_alert' ? 'alert_count' : field
        );
        expect(Object.fromEntries(sorted.map((row) => [row['entity.id'], row[field]]))).toEqual(
          Object.fromEntries(Object.entries(enriched).map(([id, values]) => [id, values[field]]))
        );
      });
    });

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
