/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { buildKeepClause } from './esql';
import { enrichEntityRows } from '../common';
import type { PageCursor, QueryArgs, Row, RunContext } from '../common';
import { COLUMN_ENRICHERS, SORT_QUERY_SPECS } from '../grid_columns';
import { alertCountQuerySpec } from './alerts';
import { anomalyCountQuerySpec } from './anomalies';
import { SPLIT_SORT_MIN_VIEW_SIZE } from './split_sort';

const { enricher: alertsEnricher } = alertCountQuerySpec;

const NOW = new Date('2026-10-04T12:00:00.000Z');

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

const cursorFor = (sortField: string): PageCursor => ({
  sortField,
  sortDirection: 'desc',
  sortValue: 42,
  entityId: 'host:h-1',
});

describe('entities grid query builders', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe.each(SORT_QUERY_SPECS)(
    'sort by %s',
    (sortField, { buildSortQuery, buildCountQuery }) => {
      it('builds the sort and count queries', () => {
        const args: QueryArgs = { ...BASE_ARGS, sort: { field: sortField, direction: 'desc' } };

        expect(buildSortQuery(args)).toMatchSnapshot('sort');
        expect(buildCountQuery(args)).toMatchSnapshot('count');
      });

      it('builds the sort and count queries with filters and a cursor', () => {
        const args: QueryArgs = {
          ...BASE_ARGS,
          ...FILTERED_ARGS,
          sort: { field: sortField, direction: 'asc' },
          cursor: cursorFor(sortField),
        };

        expect(buildSortQuery(args)).toMatchSnapshot('sort');
        expect(buildCountQuery(args)).toMatchSnapshot('count');
      });

      it('builds the sort and count queries with entity filters and no search', () => {
        const args: QueryArgs = {
          ...BASE_ARGS,
          entityExpression: ENTITY_EXPRESSION,
          sort: { field: sortField, direction: 'desc' },
        };

        expect(buildSortQuery(args)).toMatchSnapshot('sort');
        expect(buildCountQuery(args)).toMatchSnapshot('count');
      });

      it('builds the sort query with a cursor on an empty value', () => {
        const args: QueryArgs = {
          ...BASE_ARGS,
          cursor: { ...cursorFor(sortField), sortValue: null },
          sort: { field: sortField, direction: 'desc' },
        };

        expect(buildSortQuery(args)).toMatchSnapshot('sort');
      });
    }
  );

  describe.each(
    SORT_QUERY_SPECS.flatMap(([id, { runSortPage }]) =>
      runSortPage ? [[id, runSortPage] as const] : []
    )
  )('sort page by %s on a large view', (sortField, runSortPage) => {
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

      await runSortPage({ ...BASE_ARGS, ...overrides }, { runQuery, viewSize: LARGE_VIEW_SIZE });

      expect(runQuery.mock.calls.map(([query]) => query)).toMatchSnapshot();
    });
  });

  it('quotes the KEEP fields that are not plain names', () => {
    expect(
      buildKeepClause({ keepFields: ['host.os.name', 'cloud.account-id', 'labels.a:b', 'we`ird'] })
    ).toContain(', host.os.name, `cloud.account-id`, `labels.a:b`, `we``ird`');
  });

  describe('enrich queries', () => {
    it.each(COLUMN_ENRICHERS)('%s builds its query from the page rows', async (_id, { read }) => {
      const runQuery = jest.fn(async (_query: string) => []);

      await read(PAGE_ROWS, BASE_ARGS, createRunContext(runQuery));

      expect(runQuery.mock.calls.map(([query]) => query)).toMatchSnapshot();
    });

    it('does not query for a page without entity ids', async () => {
      const runQuery = jest.fn(async (_query: string) => []);

      await Promise.all(
        COLUMN_ENRICHERS.map(([, { read }]) => read([{}], BASE_ARGS, createRunContext(runQuery)))
      );

      expect(runQuery).not.toHaveBeenCalled();
    });

    it('copies the alert counts per entity onto copies of the page rows', async () => {
      const rows = PAGE_ROWS.slice(0, 2);
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

      const { rows: enriched, errors } = await enrichEntityRows(
        rows,
        BASE_ARGS,
        createRunContext(runQuery),
        [alertsEnricher]
      );

      expect(errors).toEqual([]);
      expect(enriched.map(({ 'entity.id': id, ...rest }) => [id, rest])).toEqual([
        [
          'host:h-1',
          expect.objectContaining({
            last_seen_alert: '2026-10-04T11:00:00.000Z',
            alert_count: 7,
            alert_critical: 1,
            alert_high: 2,
            alert_medium: 3,
            alert_low: 1,
          }),
        ],
        [
          'host:web-2',
          expect.objectContaining({
            last_seen_alert: null,
            alert_count: 0,
            alert_critical: 0,
            alert_high: 0,
            alert_medium: 0,
            alert_low: 0,
          }),
        ],
      ]);
      expect(rows[0]).not.toHaveProperty('alert_count');
    });

    it('skips an enricher whose fields the sort query already read', async () => {
      const runQuery = jest.fn(async (_query: string) => []);
      const sortedRows = PAGE_ROWS.map((row) => ({
        ...row,
        last_seen_alert: null,
        alert_count: 0,
        alert_critical: 0,
        alert_high: 0,
        alert_medium: 0,
        alert_low: 0,
      }));

      await enrichEntityRows(sortedRows, BASE_ARGS, createRunContext(runQuery), [alertsEnricher]);

      expect(runQuery).not.toHaveBeenCalled();
    });

    it('leaves the fields of a failed enricher unset and returns its error', async () => {
      const error = new Error('boom');
      const runQuery = jest.fn(async (query: string): Promise<Row[]> => {
        if (query.includes('alerts-security')) throw error;
        return [{ 'entity.id': 'host:h-1', anomaly_count: 2 }];
      });

      const { rows, errors } = await enrichEntityRows(
        PAGE_ROWS,
        BASE_ARGS,
        createRunContext(runQuery),
        [alertsEnricher, anomalyCountQuerySpec.enricher]
      );

      expect(errors).toEqual([error]);
      expect(rows[0]).not.toHaveProperty('alert_count');
      expect(rows[0]).toHaveProperty('anomaly_count', 2);
    });

    it('rejects when the enrichers are aborted', async () => {
      const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
      const runQuery = jest.fn(async (_query: string): Promise<Row[]> => {
        throw abort;
      });

      await expect(
        enrichEntityRows(PAGE_ROWS, BASE_ARGS, createRunContext(runQuery), [alertsEnricher])
      ).rejects.toBe(abort);
    });
  });
});
