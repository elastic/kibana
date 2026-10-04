/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import type { PageCursor, QueryArgs, Row, RunContext } from '../common';
import { ENRICH_FNS, SORTABLE_COLUMNS } from './registry';
import { alertCountColumn } from './alerts';

const NOW = new Date('2026-10-04T12:00:00.000Z');

const BASE_ARGS: QueryArgs = {
  namespace: 'default',
  timeRange: '7d',
  sort: { field: 'entity.name', direction: 'desc' },
  cursor: null,
  pageSize: 25,
  rowsMode: 'resolved',
  concreteEntityIndexName: '.entities.v2.latest.default-00001',
};

const FILTERED_ARGS: Partial<QueryArgs> = {
  rowsMode: 'individual',
  searchExpression: 'KQL("""entity.name: *gateway* or user.name: alice""")',
  entityExpression: 'asset.criticality IN ("high_impact", "extreme_impact")',
  keepFields: ['host.os.name'],
};

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

  describe.each(SORTABLE_COLUMNS.map((column) => [column.id, column] as const))(
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
    }
  );

  describe('enrich queries', () => {
    it.each(ENRICH_FNS.map((enrich) => [enrich.name, enrich] as const))(
      '%s builds its query from the page rows',
      async (_name, enrich) => {
        const runQuery = jest.fn(async (_query: string) => []);

        await enrich(
          PAGE_ROWS.map((row) => ({ ...row })),
          BASE_ARGS,
          new Set(),
          createRunContext(runQuery)
        );

        expect(runQuery.mock.calls.map(([query]) => query)).toMatchSnapshot();
      }
    );

    it('does not query for a page without entity ids', async () => {
      const runQuery = jest.fn(async (_query: string) => []);

      await Promise.all(
        ENRICH_FNS.map((enrich) => enrich([{}], BASE_ARGS, new Set(), createRunContext(runQuery)))
      );

      expect(runQuery).not.toHaveBeenCalled();
    });

    it('copies the alert counts per entity onto the page rows', async () => {
      const rows = PAGE_ROWS.slice(0, 2).map((row) => ({ ...row }));
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

      await alertCountColumn.enrichPage(rows, BASE_ARGS, new Set(), createRunContext(runQuery));

      expect(rows.map(({ 'entity.id': id, ...rest }) => [id, rest])).toEqual([
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
    });
  });
});
