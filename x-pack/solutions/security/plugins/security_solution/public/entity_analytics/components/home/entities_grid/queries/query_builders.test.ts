/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { buildRowFieldsSteps, buildEntityAggregations } from './esql';
import { buildRollUpOverAliasesSteps } from './resolved_entities';
import type { EntityAggregation } from './esql';
import type { QueryArgs, Row } from '../common';
import { QUERY_SPECS } from '../grid_columns';
import { buildEntitiesInViewCountQuery } from './entities_in_view';
import { alertCountQuerySpec } from './alerts';
import { anomalyCountQuerySpec } from './anomalies';
import type { PageEnricher, RunContext, SortPageFetcher } from './types';

const SPECS = Object.entries(QUERY_SPECS);

const SORT_PAGE_FETCHERS = SPECS.flatMap(
  ([id, spec]): Array<[string, SortPageFetcher]> =>
    spec?.fetchSortPage ? [[id, spec.fetchSortPage]] : []
);

const COLUMN_ENRICHERS = SPECS.flatMap(
  ([id, spec]): Array<[string, PageEnricher]> => (spec?.enricher ? [[id, spec.enricher]] : [])
);

const { enricher: alertsEnricher } = alertCountQuerySpec;
const { enricher: anomaliesEnricher } = anomalyCountQuerySpec;

const BASE_ARGS: QueryArgs = {
  namespace: 'default',
  timeRange: '7d',
  sort: { field: 'entity.name', direction: 'desc' },
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

/** Sorts that read their rows in parts; the others run one query. */
const SPLIT_SORT_FETCHERS = SORT_PAGE_FETCHERS.filter(([id]) =>
  ['group_size', 'risk_score_change', 'alert_count', 'last_seen_alert', 'anomaly_count'].includes(
    id
  )
);

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

const recordSortQueries = async (
  fetchSortPage: SortPageFetcher,
  args: QueryArgs
): Promise<string> => {
  const queries: string[] = [];
  await fetchSortPage(args, {
    runQuery: async (steps) => {
      queries.push(steps.join('\n'));
      return [];
    },
  });
  return queries.join('\n\n');
};

describe('entities grid query builders', () => {
  describe('count', () => {
    it.each([
      ['no filters', {}],
      ['filters', FILTERED_ARGS],
      ['entity filters and no search', { entityExpression: ENTITY_EXPRESSION }],
    ] as const)('builds the count query with %s', (_name, overrides) => {
      expect(
        buildEntitiesInViewCountQuery({ ...BASE_ARGS, ...overrides }).join('\n')
      ).toMatchSnapshot();
    });
  });

  describe.each(SORT_PAGE_FETCHERS)('sort by %s', (sortField, fetchSortPage) => {
    it('builds the sort query', async () => {
      const args: QueryArgs = { ...BASE_ARGS, sort: { field: sortField, direction: 'desc' } };

      expect(await recordSortQueries(fetchSortPage, args)).toMatchSnapshot();
    });

    it('builds the sort query with filters', async () => {
      const args: QueryArgs = {
        ...BASE_ARGS,
        ...FILTERED_ARGS,
        sort: { field: sortField, direction: 'asc' },
      };

      expect(await recordSortQueries(fetchSortPage, args)).toMatchSnapshot();
    });

    it('builds the sort query with entity filters and no search', async () => {
      const args: QueryArgs = {
        ...BASE_ARGS,
        entityExpression: ENTITY_EXPRESSION,
        sort: { field: sortField, direction: 'desc' },
      };

      expect(await recordSortQueries(fetchSortPage, args)).toMatchSnapshot();
    });
  });

  describe.each(SPLIT_SORT_FETCHERS)(
    'sort page by %s with value rows',
    (sortField, fetchSortPage) => {
      it.each([
        ['the first page descending', { sort: { field: sortField, direction: 'desc' } }],
        ['the first page ascending', { sort: { field: sortField, direction: 'asc' } }],
        [
          'the first page with entity filters',
          {
            sort: { field: sortField, direction: 'desc' },
            entityExpression: ENTITY_EXPRESSION,
          },
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
          async (_steps: readonly string[]): Promise<Row[]> => [
            { 'entity.id': 'host:h-1', [sortField]: 3 },
          ]
        );

        await fetchSortPage({ ...BASE_ARGS, ...overrides }, { runQuery });

        expect(runQuery.mock.calls.map(([steps]) => steps.join('\n'))).toMatchSnapshot();
      });
    }
  );

  it('quotes the KEEP fields that are not plain names', () => {
    expect(
      buildRowFieldsSteps({
        ...BASE_ARGS,
        keepFields: ['host.os.name', 'cloud.account-id', 'labels.a:b', 'we`ird'],
      }).join('\n')
    ).toContain(', host.os.name, `cloud.account-id`, `labels.a:b`, `we``ird`');
  });

  describe('the risk score of a row', () => {
    const RESOLVED_RISK =
      '| EVAL entity.risk.calculated_score_norm = COALESCE(entity.relationships.resolution.risk.calculated_score_norm, entity.risk.calculated_score_norm)';

    it("is the resolved entity's for a resolved row, with the main entity's own as the fallback", () => {
      expect(buildRowFieldsSteps({ keepFields: [], rowsMode: 'resolved' })).toContain(
        RESOLVED_RISK
      );
    });

    it("is the entity's own for an individual row", () => {
      expect(
        buildRowFieldsSteps({ keepFields: [], rowsMode: 'individual' }).join('\n')
      ).not.toContain('entity.relationships.resolution.risk');
    });
  });

  describe('the aggregations of a resolved row', () => {
    const AGGREGATIONS: readonly EntityAggregation[] = [
      { field: 'last_at', aggregation: 'MAX(`@timestamp`)', resolvedEntity: 'MAX' },
      { field: 'total', aggregation: 'COUNT(*)', resolvedEntity: 'SUM' },
      {
        field: 'high',
        aggregation: 'COUNT(*)',
        condition: 'level == "high"',
        resolvedEntity: 'SUM',
      },
    ];

    it('aggregates every column over the rows that match its condition', () => {
      expect(buildEntityAggregations(AGGREGATIONS, 'is_alert')).toEqual([
        'last_at = MAX(`@timestamp`) WHERE is_alert',
        'total = COUNT(*) WHERE is_alert',
        'high = COUNT(*) WHERE is_alert AND level == "high"',
      ]);
    });

    it('gives the rows of an alias to its resolved entity, and aggregates them', () => {
      expect(buildRollUpOverAliasesSteps(BASE_ARGS, AGGREGATIONS)).toEqual([
        `| LOOKUP JOIN ${BASE_ARGS.concreteEntityIndexName} ON \`entity.id\``,
        '| EVAL `entity.id` = COALESCE(entity.relationships.resolution.resolved_to, `entity.id`)',
        '| STATS last_at = MAX(last_at), total = SUM(total), high = SUM(high) BY `entity.id`',
      ]);
    });

    it('keeps only the ids when there is nothing to aggregate', () => {
      expect(buildRollUpOverAliasesSteps(BASE_ARGS, []).at(-1)).toBe('| STATS BY `entity.id`');
    });

    it('leaves individual rows as they are', () => {
      expect(
        buildRollUpOverAliasesSteps({ ...BASE_ARGS, rowsMode: 'individual' }, AGGREGATIONS)
      ).toEqual([]);
    });
  });

  describe('the enrich queries of a resolved row', () => {
    const ALIAS: Row = {
      'entity.id': 'host:alias-1',
      'entity.EngineMetadata.Type': 'host',
      'host.name': 'alias-1',
      'entity.relationships.resolution.resolved_to': 'host:h-1',
    };
    const pageRows = PAGE_ROWS.slice(0, 1);

    /** Answers the read of the aliases with `ALIAS`, and the other queries with `rows`. */
    const createRunner = (rows: Row[]) =>
      jest.fn(
        async (steps: readonly string[]): Promise<Row[]> =>
          steps.join('\n').includes('resolved_to IN') ? [ALIAS] : rows
      );

    it.each([
      ['alerts', alertsEnricher, 'alert_count', 3],
      ['anomalies', anomaliesEnricher, 'anomaly_count', 3],
    ] as const)(
      'reads the %s of the aliases too, for the row of their resolved entity',
      async (_name, enricher, field, count) => {
        const runQuery = createRunner([{ 'entity.id': 'host:h-1', [field]: count }]);

        const fields = await enricher.fetch(pageRows, BASE_ARGS, createRunContext(runQuery));

        const [aliasQuery, enrichQuery] = runQuery.mock.calls.map(([steps]) => steps.join('\n'));
        expect(aliasQuery).toContain('resolved_to IN ("host:h-1")');
        expect(enrichQuery).toContain('host:alias-1');
        expect(enrichQuery).toContain(`${field} = SUM(${field})`);
        expect(fields.get('host:h-1')).toMatchObject({ [field]: count });
        expect(fields.has('host:alias-1')).toBe(false);
      }
    );

    it('reads no anomalies without security jobs, as there is no anomaly index', async () => {
      const runQuery = createRunner([]);

      const fields = await anomaliesEnricher.fetch(
        pageRows,
        { ...BASE_ARGS, anomalyJobIds: [] },
        createRunContext(runQuery)
      );

      expect(runQuery).not.toHaveBeenCalled();
      expect(fields.get('host:h-1')).toEqual({ anomaly_count: null });
    });

    it('sorts by anomalies without security jobs by entity id, reading no anomaly index', async () => {
      const runQuery = createRunner(pageRows);

      const rows = await anomalyCountQuerySpec.fetchSortPage(
        { ...BASE_ARGS, sort: { field: 'anomaly_count', direction: 'desc' }, anomalyJobIds: [] },
        createRunContext(runQuery)
      );

      expect(rows).toEqual(pageRows.map((row) => expect.objectContaining(row)));
      expect(runQuery.mock.calls.flat(2).join('\n')).not.toContain('.ml-anomalies');
    });

    it('reads the alerts of many entities in several queries, which ES|QL can parse', async () => {
      const runQuery = createRunner([]);
      const manyRows = Array.from({ length: 300 }, (_, i) => ({
        'entity.id': `host:h-${i}`,
        'entity.EngineMetadata.Type': 'host',
        'host.id': `h-${i}`,
      }));

      await alertsEnricher.fetch(
        manyRows,
        { ...BASE_ARGS, rowsMode: 'individual' },
        createRunContext(runQuery)
      );

      expect(runQuery).toHaveBeenCalledTimes(2);
    });

    it('reads no aliases for individual rows', async () => {
      const runQuery = createRunner([]);

      await alertsEnricher.fetch(
        pageRows,
        { ...BASE_ARGS, rowsMode: 'individual' },
        createRunContext(runQuery)
      );

      expect(runQuery).toHaveBeenCalledTimes(1);
      expect(runQuery.mock.calls[0][0].join('\n')).not.toContain('LOOKUP JOIN');
    });
  });

  describe('enrich queries', () => {
    it.each(COLUMN_ENRICHERS)('%s builds its query from the page rows', async (_id, { fetch }) => {
      const runQuery = jest.fn(async (_steps: readonly string[]) => []);

      await fetch(PAGE_ROWS, BASE_ARGS, createRunContext(runQuery));

      expect(runQuery.mock.calls.map(([steps]) => steps.join('\n'))).toMatchSnapshot();
    });

    it('does not query for a page without entity ids', async () => {
      const runQuery = jest.fn(async (_steps: readonly string[]) => []);

      await Promise.all(
        COLUMN_ENRICHERS.map(([, { fetch }]) => fetch([{}], BASE_ARGS, createRunContext(runQuery)))
      );

      expect(runQuery).not.toHaveBeenCalled();
    });

    describe('a group too large for one query', () => {
      const GROUP = 'host:big';
      const MEMBERS = 300;
      const groupRows = Array.from({ length: MEMBERS }, (_, i) => ({
        'entity.id': `host:big-${i}`,
        'entity.EngineMetadata.Type': 'host',
        'host.id': `big-${i}`,
        'entity.relationships.resolution.resolved_to': GROUP,
      }));
      const isAliasRead = (steps: readonly string[]) =>
        steps.join('\n').includes('resolved_to IN ("host:big")');

      it('reads the alerts of a resolved group in parts and adds them up', async () => {
        let alertQueries = 0;
        const runQuery = jest.fn(async (steps: readonly string[]): Promise<Row[]> => {
          if (isAliasRead(steps)) return groupRows;
          alertQueries += 1;
          return [
            {
              'entity.id': GROUP,
              alert_count: 2,
              alert_critical: 1,
              alert_high: 1,
              alert_medium: 0,
              alert_low: 0,
              last_seen_alert: `2026-10-18T1${alertQueries}:00:00.000Z`,
            },
          ];
        });

        const fields = await alertsEnricher.fetch(
          [{ 'entity.id': GROUP, 'entity.EngineMetadata.Type': 'host', 'host.id': 'big' }],
          BASE_ARGS,
          createRunContext(runQuery)
        );

        // 301 entities: the alias read, then two alert queries of up to 250.
        expect(runQuery).toHaveBeenCalledTimes(3);
        expect(fields.get(GROUP)).toEqual({
          alert_count: 4,
          alert_critical: 2,
          alert_high: 2,
          alert_medium: 0,
          alert_low: 0,
          last_seen_alert: '2026-10-18T12:00:00.000Z',
        });
      });

      it('reads the alerts of many individual records of one group without failing', async () => {
        const runQuery = jest.fn(async (_steps: readonly string[]): Promise<Row[]> => []);

        await alertsEnricher.fetch(
          groupRows,
          { ...BASE_ARGS, rowsMode: 'individual' },
          createRunContext(runQuery)
        );

        expect(runQuery).toHaveBeenCalledTimes(2);
      });
    });

    it('sets every alert field per entity, null for entities without alerts', async () => {
      const runQuery = jest.fn(async (_steps: readonly string[]) => [
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
        { ...BASE_ARGS, rowsMode: 'individual' },
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
          alert_count: null,
          alert_critical: null,
          alert_high: null,
          alert_medium: null,
          alert_low: null,
        },
      });
    });
  });
});
