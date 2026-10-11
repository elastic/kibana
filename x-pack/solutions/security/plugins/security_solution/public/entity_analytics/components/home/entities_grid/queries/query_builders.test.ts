/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { buildKeepClause } from './esql';
import type { PageCursor, QueryArgs, Row } from '../common';
import { COLUMN_ENRICHERS, SORT_PAGE_FETCHERS } from '../grid_columns';
import { buildEntitiesInViewCountQuery } from './entities_in_view';
import { alertCountQuerySpec } from './alerts';
import { SPLIT_SORT_MIN_VIEW_SIZE } from './split_sort';
import type { RunContext, SortPageFetcher } from './types';

const { enricher: alertsEnricher } = alertCountQuerySpec;

const BASE_ARGS: QueryArgs = {
  namespace: 'default',
  timeRange: '7d',
  sort: { field: 'entity.name', direction: 'desc' },
  cursor: null,
  pageSize: 25,
  rowsMode: 'resolved',
  concreteEntityIndexName: '.entities.v2.latest.default-00001',
  anomalyJobIds: ['security_auth_rare_user'],
};

const ENTITY_EXPRESSION = 'asset.criticality IN ("high_impact", "extreme_impact")';

const FILTERED_ARGS: Partial<QueryArgs> = {
  rowsMode: 'individual',
  searchExpression: 'KQL("""entity.name: *gateway* or user.name: alice""")',
  entityExpression: ENTITY_EXPRESSION,
  keepFields: ['host.os.name'],
};

const LARGE_VIEW_SIZE = SPLIT_SORT_MIN_VIEW_SIZE;

/** Sorts that read a large view in parts; the others run the same query on every view. */
const LARGE_VIEW_FETCHERS = SORT_PAGE_FETCHERS.filter(([id]) =>
  ['group_size', 'risk_score_change', 'alert_count', 'last_seen_alert', 'anomaly_count'].includes(
    id
  )
);

/** Sort value of the rows without a value, per sort page column; null when not listed. */
const EMPTY_SORT_VALUES: Readonly<Record<string, number>> = { alert_count: 0, group_size: 1 };

const PAGE_ROWS: readonly Row[] = [
  {
    'entity.id': 'host:h-1',
    'entity.EngineMetadata.Type': 'host',
    'host.id': 'h-1',
    'host.name': 'web-1',
    'entity.risk.calculated_score_norm': 70,
  },
  { 'entity.id': 'host:web-2', 'entity.EngineMetadata.Type': 'host', 'host.name': 'web-2' },
  {
    'entity.id': 'user:alice@h-1@local',
    'entity.EngineMetadata.Type': 'user',
    'user.name': 'alice',
    'host.id': 'h-1',
    'entity.namespace': 'local',
  },
  {
    'entity.id': 'user:bob@corp.com@okta',
    'entity.EngineMetadata.Type': 'user',
    'user.email': 'bob@corp.com',
    'user.name': 'bob',
    'entity.namespace': 'okta',
  },
  {
    'entity.id': 'service:payments',
    'entity.EngineMetadata.Type': 'service',
    'service.name': 'payments',
  },
];

const createRunContext = (runQuery: RunContext['runQuery']): RunContext => {
  const http = httpServiceMock.createSetupContract();
  http.post.mockResolvedValue({});
  return { runQuery, http };
};

/** The queries a sort page runs, joined; one query on a small view. */
const recordSortQueries = async (
  fetchSortPage: SortPageFetcher,
  args: QueryArgs,
  viewSize: number
): Promise<string> => {
  const queries: string[] = [];
  await fetchSortPage(args, {
    runQuery: async (query) => {
      queries.push(query);
      return [];
    },
    fetchViewSize: async () => viewSize,
  });
  return queries.join('\n\n');
};

const cursorFor = (sortField: string): PageCursor => ({
  sortField,
  sortDirection: 'desc',
  sortValue: 42,
  entityId: 'host:h-1',
});

describe('entities grid query builders', () => {
  describe('count', () => {
    it.each([
      ['no filters', {}],
      ['filters', FILTERED_ARGS],
      ['entity filters and no search', { entityExpression: ENTITY_EXPRESSION }],
    ] as const)('builds the count query with %s', (_name, overrides) => {
      expect(buildEntitiesInViewCountQuery({ ...BASE_ARGS, ...overrides })).toMatchSnapshot();
    });
  });

  describe.each(SORT_PAGE_FETCHERS)('sort by %s', (sortField, fetchSortPage) => {
    it('builds the sort query', async () => {
      const args: QueryArgs = { ...BASE_ARGS, sort: { field: sortField, direction: 'desc' } };

      expect(await recordSortQueries(fetchSortPage, args, 0)).toMatchSnapshot();
    });

    it('builds the sort query with filters and a cursor', async () => {
      const args: QueryArgs = {
        ...BASE_ARGS,
        ...FILTERED_ARGS,
        sort: { field: sortField, direction: 'asc' },
        cursor: cursorFor(sortField),
      };

      expect(await recordSortQueries(fetchSortPage, args, 0)).toMatchSnapshot();
    });

    it('builds the sort query with entity filters and no search', async () => {
      const args: QueryArgs = {
        ...BASE_ARGS,
        entityExpression: ENTITY_EXPRESSION,
        sort: { field: sortField, direction: 'desc' },
      };

      expect(await recordSortQueries(fetchSortPage, args, 0)).toMatchSnapshot();
    });

    it('builds the sort query with a cursor on an empty value', async () => {
      const args: QueryArgs = {
        ...BASE_ARGS,
        cursor: { ...cursorFor(sortField), sortValue: null },
        sort: { field: sortField, direction: 'desc' },
      };

      expect(await recordSortQueries(fetchSortPage, args, 0)).toMatchSnapshot();
    });
  });

  describe.each(LARGE_VIEW_FETCHERS)(
    'sort page by %s on a large view',
    (sortField, fetchSortPage) => {
      const emptyCursor: PageCursor = {
        ...cursorFor(sortField),
        sortValue: EMPTY_SORT_VALUES[sortField] ?? null,
      };

      it.each([
        ['the first page descending', { sort: { field: sortField, direction: 'desc' } }],
        ['the first page ascending', { sort: { field: sortField, direction: 'asc' } }],
        [
          'a page after a value with entity filters',
          {
            sort: { field: sortField, direction: 'desc' },
            entityExpression: ENTITY_EXPRESSION,
            cursor: cursorFor(sortField),
          },
        ],
        [
          'a page after an empty value',
          { sort: { field: sortField, direction: 'desc' }, cursor: emptyCursor },
        ],
        [
          'the first page with a search',
          {
            sort: { field: sortField, direction: 'desc' },
            searchExpression: 'KQL("""entity.name: host-001-payments-db""")',
          },
        ],
      ] as const)('runs the queries of %s', async (_name, overrides) => {
        const runQuery = jest.fn(
          async (_query: string): Promise<Row[]> => [{ 'entity.id': 'host:h-1', [sortField]: 3 }]
        );

        await fetchSortPage(
          { ...BASE_ARGS, ...overrides },
          { runQuery, fetchViewSize: async () => LARGE_VIEW_SIZE }
        );

        expect(runQuery.mock.calls.map(([query]) => query)).toMatchSnapshot();
      });
    }
  );

  it('quotes the KEEP fields that are not plain names', () => {
    expect(
      buildKeepClause({ keepFields: ['host.os.name', 'cloud.account-id', 'labels.a:b', 'we`ird'] })
    ).toContain(', host.os.name, `cloud.account-id`, `labels.a:b`, `we``ird`');
  });

  describe('enrich queries', () => {
    it.each(COLUMN_ENRICHERS)('%s builds its query from the page rows', async (_id, { fetch }) => {
      const runQuery = jest.fn(async (_query: string) => []);

      await fetch(PAGE_ROWS, BASE_ARGS, createRunContext(runQuery));

      expect(runQuery.mock.calls.map(([query]) => query)).toMatchSnapshot();
    });

    it('does not query for a page without entity ids', async () => {
      const runQuery = jest.fn(async (_query: string) => []);

      await Promise.all(
        COLUMN_ENRICHERS.map(([, { fetch }]) => fetch([{}], BASE_ARGS, createRunContext(runQuery)))
      );

      expect(runQuery).not.toHaveBeenCalled();
    });

    it('sets every alert field per entity, 0 or null for entities without alerts', async () => {
      const runQuery = jest.fn(async (_query: string) => [
        {
          'entity.id': 'host:h-1',
          last_seen_alert: '2026-10-04T11:00:00.000Z',
          alert_count: 7,
          alert_critical: 1,
          alert_high: 2,
          alert_medium: 3,
          alert_low: 1,
        },
      ]);

      const fields = await alertsEnricher.fetch(
        PAGE_ROWS.slice(0, 2),
        BASE_ARGS,
        createRunContext(runQuery)
      );

      expect(Object.fromEntries(fields)).toEqual({
        'host:h-1': {
          last_seen_alert: '2026-10-04T11:00:00.000Z',
          alert_count: 7,
          alert_critical: 1,
          alert_high: 2,
          alert_medium: 3,
          alert_low: 1,
        },
        'host:web-2': {
          last_seen_alert: null,
          alert_count: 0,
          alert_critical: 0,
          alert_high: 0,
          alert_medium: 0,
          alert_low: 0,
        },
      });
    });
  });
});
