/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { EntityUpdateClient } from '@kbn/entity-store/server';
import { EntityType } from '../../../../../../common/entity_analytics/types';
import {
  calculateBaseEntityScores,
  persistZeroBaseScore,
  scoreBaseEntities,
} from './score_base_entities';
import type { ScopedLogger } from '../utils/with_log_context';
import type { RiskEngineDataWriter } from '../../risk_engine_data_writer';
import { BASE_STORE_LOOKUP_FIELDS } from './base_store_lookup';

const buildLogger = (): ScopedLogger =>
  ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as ScopedLogger);

const collectPages = async <T>(generator: AsyncGenerator<T>): Promise<T[]> => {
  const pages: T[] = [];
  for await (const page of generator) {
    pages.push(page);
  }
  return pages;
};

const baseParams = {
  entityType: EntityType.user,
  alertFilters: [],
  alertsIndex: '.alerts-security.alerts-default',
  pageSize: 100,
  sampleSize: 1000,
  now: '2026-01-01T00:00:00.000Z',
  watchlistConfigs: new Map(),
  calculationRunId: 'run-1',
};

// Build a fake ES|QL row in the column order parseEsqlBaseScoreRow expects:
// [alert_count, scores, risk_inputs, entity_id]
const esqlRow = (entityId: string) => [
  1,
  0.5,
  '{"risk_score":"50","time":"2026-01-01T00:00:00.000Z","id":"a"}',
  entityId,
];

const ENTITY_STORE_INDEX = '.entities.v2.latest.default-00001';

interface StoreDoc {
  criticality?: string;
  level?: string;
  score?: number;
  scoreNorm?: number;
}

// A scoring query response whose rows carry the joined entity store fields. `null` means the
// entity has no store document, so every joined field is null.
const esqlPageWithStore = (rows: Array<[entityId: string, store: StoreDoc | null]>) => ({
  columns: ['alert_count', 'scores', 'risk_inputs', 'entity.id', ...BASE_STORE_LOOKUP_FIELDS].map(
    (name) => ({ name, type: 'keyword' })
  ),
  values: rows.map(([entityId, store]) => [
    ...esqlRow(entityId),
    store ? 'user' : null,
    store?.criticality ?? null,
    null,
    null,
    store?.level ?? null,
    store?.score ?? null,
    store?.scoreNorm ?? null,
  ]),
});

// Composite agg page: pass entityIds as bucket keys, optional after_key for
// the next page (omitted means terminal page).
const mockCompositeAggPage = (
  esClient: ElasticsearchClient,
  entityIds: string[],
  afterKey?: Record<string, string>
) => {
  (esClient.search as jest.Mock).mockImplementationOnce(async () => ({
    aggregations: {
      by_entity_id: {
        buckets: entityIds.map((entity_id) => ({ key: { entity_id } })),
        ...(afterKey ? { after_key: afterKey } : {}),
      },
    },
  }));
};

describe('score_base_entities', () => {
  let esClient: ElasticsearchClient;
  let crudClient: EntityUpdateClient;
  let logger: ScopedLogger;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
    crudClient = {
      listEntities: jest.fn(),
      bulkUpdateEntity: jest.fn().mockResolvedValue([]),
      latestIndexName: jest.fn().mockResolvedValue(ENTITY_STORE_INDEX),
    } as unknown as EntityUpdateClient;
    logger = buildLogger();
    (crudClient.listEntities as jest.Mock).mockResolvedValue({
      entities: [],
      nextSearchAfter: undefined,
    });
    // Some alerts lack a stamped EUID, so pages come from the runtime mapping unless a test says
    // otherwise.
    (esClient.count as jest.Mock).mockResolvedValue({ count: 1 });
  });

  it('terminates after a single page when the composite agg has no after_key', async () => {
    mockCompositeAggPage(esClient, ['user:a@okta']);
    (esClient.esql.query as jest.Mock).mockResolvedValueOnce({
      values: [esqlRow('user:a@okta')],
    });

    await collectPages(
      calculateBaseEntityScores({
        esClient,
        crudClient,
        logger,
        createMissingEntities: false,
        ...baseParams,
      })
    );

    expect(esClient.search as jest.Mock).toHaveBeenCalledTimes(1);
    expect(esClient.esql.query as jest.Mock).toHaveBeenCalledTimes(1);

    const compositeCall = (esClient.search as jest.Mock).mock.calls[0][0];
    expect(compositeCall.index).toBe(baseParams.alertsIndex);
    expect(compositeCall.aggs.by_entity_id.composite.size).toBe(baseParams.pageSize);
    expect(compositeCall.ignore_unavailable).toBe(true);

    const esqlQuery = (esClient.esql.query as jest.Mock).mock.calls[0][0].query as string;
    expect(esqlQuery).toContain('entity_id <= "user:a@okta"');
    expect(esqlQuery).not.toContain('entity_id >');
  });

  it('paginates by composite after_key and applies a half-open EUID range to scoring', async () => {
    mockCompositeAggPage(esClient, ['user:001@okta', 'user:002@okta'], {
      entity_id: 'user:002@okta',
    });
    mockCompositeAggPage(esClient, ['user:003@okta']);

    (esClient.esql.query as jest.Mock)
      .mockResolvedValueOnce({
        values: [esqlRow('user:001@okta'), esqlRow('user:002@okta')],
      })
      .mockResolvedValueOnce({ values: [esqlRow('user:003@okta')] });

    await collectPages(
      calculateBaseEntityScores({
        esClient,
        crudClient,
        logger,
        createMissingEntities: false,
        ...baseParams,
      })
    );

    expect(esClient.search as jest.Mock).toHaveBeenCalledTimes(2);
    const secondCompositeCall = (esClient.search as jest.Mock).mock.calls[1][0];
    expect(secondCompositeCall.aggs.by_entity_id.composite.after).toEqual({
      entity_id: 'user:002@okta',
    });

    const secondEsqlQuery = (esClient.esql.query as jest.Mock).mock.calls[1][0].query as string;
    // Half-open range: previous upper becomes the new exclusive lower.
    expect(secondEsqlQuery).toContain('entity_id > "user:002@okta"');
    expect(secondEsqlQuery).toContain('entity_id <= "user:003@okta"');
  });

  it('does not produce another ES|QL call when the abort signal fires between pages', async () => {
    const controller = new AbortController();
    mockCompositeAggPage(esClient, ['user:a@okta'], { entity_id: 'user:a@okta' });

    (esClient.esql.query as jest.Mock).mockImplementationOnce(async () => {
      controller.abort();
      return { values: [esqlRow('user:a@okta')] };
    });

    await collectPages(
      calculateBaseEntityScores({
        esClient,
        crudClient,
        logger,
        createMissingEntities: false,
        ...baseParams,
        abortSignal: controller.signal,
      })
    );

    expect(esClient.esql.query as jest.Mock).toHaveBeenCalledTimes(1);
  });

  it("joins each scored entity's store document in the scoring query instead of fetching it", async () => {
    mockCompositeAggPage(esClient, ['user:a@okta']);
    (esClient.esql.query as jest.Mock).mockResolvedValueOnce(
      esqlPageWithStore([['user:a@okta', {}]])
    );

    await collectPages(
      calculateBaseEntityScores({
        esClient,
        crudClient,
        logger,
        createMissingEntities: false,
        ...baseParams,
      })
    );

    const query = (esClient.esql.query as jest.Mock).mock.calls[0][0].query as string;
    expect(query).toContain(`LOOKUP JOIN ${ENTITY_STORE_INDEX} ON entity.id`);
    expect(query).toContain('KEEP alert_count, scores, risk_inputs, entity.id, ');
    expect(crudClient.listEntities).not.toHaveBeenCalled();
  });

  it('applies the modifiers the joined store document carries', async () => {
    mockCompositeAggPage(esClient, ['user:a@okta']);
    (esClient.esql.query as jest.Mock).mockResolvedValueOnce(
      esqlPageWithStore([['user:a@okta', { criticality: 'high_impact' }]])
    );

    const [page] = await collectPages(
      calculateBaseEntityScores({
        esClient,
        crudClient,
        logger,
        createMissingEntities: false,
        ...baseParams,
      })
    );

    expect(page.entities.get('user:a@okta')?.asset?.criticality).toBe('high_impact');
    expect(page.scores[0].criticality_level).toBe('high_impact');
  });

  it('terminates without scoring when the composite agg returns zero buckets', async () => {
    mockCompositeAggPage(esClient, []);

    await collectPages(
      calculateBaseEntityScores({
        esClient,
        crudClient,
        logger,
        createMissingEntities: false,
        ...baseParams,
      })
    );

    expect(esClient.search as jest.Mock).toHaveBeenCalledTimes(1);
    expect(esClient.esql.query as jest.Mock).not.toHaveBeenCalled();
  });

  describe('when every alert has a stamped EUID', () => {
    beforeEach(() => {
      (esClient.count as jest.Mock).mockResolvedValue({ count: 0 });
    });

    const run = () =>
      collectPages(
        calculateBaseEntityScores({
          esClient,
          crudClient,
          logger,
          createMissingEntities: false,
          ...baseParams,
        })
      );

    it('checks for unstamped alerts of the type being scored', async () => {
      mockCompositeAggPage(esClient, []);

      await run();

      const countCall = (esClient.count as jest.Mock).mock.calls[0][0];
      expect(countCall.index).toBe(baseParams.alertsIndex);
      expect(countCall.ignore_unavailable).toBe(true);
      expect(countCall.query.bool.must_not).toEqual([
        { prefix: { 'kibana.alert.entity.id': 'user:' } },
      ]);
    });

    it('pages through the stamped field without a runtime mapping, starting at the type prefix', async () => {
      mockCompositeAggPage(esClient, ['user:a@okta']);
      (esClient.esql.query as jest.Mock).mockResolvedValueOnce({
        values: [esqlRow('user:a@okta')],
      });

      await run();

      const compositeCall = (esClient.search as jest.Mock).mock.calls[0][0];
      expect(compositeCall.runtime_mappings).toBeUndefined();
      expect(compositeCall.ignore_unavailable).toBe(true);
      expect(compositeCall.aggs.by_entity_id.composite.sources).toEqual([
        { entity_id: { terms: { field: 'kibana.alert.entity.id' } } },
      ]);
      expect(compositeCall.aggs.by_entity_id.composite.after).toEqual({ entity_id: 'user:' });
      expect(compositeCall.query.bool.filter).toContainEqual({
        prefix: { 'kibana.alert.entity.id': 'user:' },
      });
    });

    it("limits each scoring query to its page's stamped EUIDs", async () => {
      mockCompositeAggPage(esClient, ['user:001@okta', 'user:002@okta'], {
        entity_id: 'user:002@okta',
      });
      mockCompositeAggPage(esClient, ['user:003@okta']);
      (esClient.esql.query as jest.Mock)
        .mockResolvedValueOnce({ values: [esqlRow('user:001@okta')] })
        .mockResolvedValueOnce({ values: [esqlRow('user:003@okta')] });

      await run();

      const [firstFilter, secondFilter] = (esClient.esql.query as jest.Mock).mock.calls.map(
        ([request]) => request.filter.bool.filter
      );
      // The first page starts at the type prefix so other types' EUIDs that sort before it are
      // left out.
      expect(firstFilter).toContainEqual({
        range: { 'kibana.alert.entity.id': { gte: 'user:', lte: 'user:002@okta' } },
      });
      expect(secondFilter).toContainEqual({
        range: { 'kibana.alert.entity.id': { gt: 'user:002@okta', lte: 'user:003@okta' } },
      });
      // The computed EUID range stays in the query, so the filter only narrows what it reads.
      const secondQuery = (esClient.esql.query as jest.Mock).mock.calls[1][0].query as string;
      expect(secondQuery).toContain('entity_id > "user:002@okta"');
    });

    it("stops at the first EUID of another type, since the stamp holds every type's EUID", async () => {
      // Host alerts often carry a user EUID too, and user EUIDs sort after host ones.
      mockCompositeAggPage(esClient, ['host:a', 'host:b', 'user:x@okta'], {
        entity_id: 'user:x@okta',
      });
      (esClient.esql.query as jest.Mock).mockResolvedValueOnce({
        values: [esqlRow('host:a'), esqlRow('host:b')],
      });

      await collectPages(
        calculateBaseEntityScores({
          esClient,
          crudClient,
          logger,
          createMissingEntities: false,
          ...baseParams,
          entityType: EntityType.host,
        })
      );

      expect(esClient.search as jest.Mock).toHaveBeenCalledTimes(1);
      expect(esClient.esql.query as jest.Mock).toHaveBeenCalledTimes(1);
      const query = (esClient.esql.query as jest.Mock).mock.calls[0][0].query as string;
      expect(query).toContain('entity_id <= "host:b"');
    });

    it('scores nothing when the first stamped EUID belongs to another type', async () => {
      mockCompositeAggPage(esClient, ['user:x@okta']);

      await collectPages(
        calculateBaseEntityScores({
          esClient,
          crudClient,
          logger,
          createMissingEntities: false,
          ...baseParams,
          entityType: EntityType.host,
        })
      );

      expect(esClient.esql.query as jest.Mock).not.toHaveBeenCalled();
    });
  });

  describe('with sampled page bounds', () => {
    const sampledKeys = ['user:01', 'user:02', 'user:03', 'user:04', 'user:05', 'user:06'];
    const searchResponse = (fields: Partial<SearchResponse>): SearchResponse => ({
      took: 3,
      timed_out: false,
      _shards: { total: 1, successful: 1, failed: 0 },
      hits: { hits: [] },
      ...fields,
    });
    const range = (bounds: { gte?: string; gt?: string; lte: string }) => ({
      bool: { filter: [{ range: { 'kibana.alert.entity.id': bounds } }] },
    });

    beforeEach(() => {
      jest.mocked(esClient.count).mockResolvedValue({
        count: 0,
        _shards: { total: 1, successful: 1, failed: 0 },
      });
      // 20 entities over 40 alerts; six sampled IDs stand for them, so every third closes a page.
      jest.mocked(esClient.esql.query).mockResolvedValueOnce({
        columns: [
          { name: 'entities', type: 'long' },
          { name: 'alerts', type: 'long' },
        ],
        values: [[20, 40]],
      });
      jest.mocked(esClient.search).mockResolvedValueOnce(
        searchResponse({
          aggregations: {
            sample: {
              doc_count: sampledKeys.length,
              keys: {
                buckets: sampledKeys.map((entityId) => ({
                  key: { entity_id: entityId },
                  doc_count: 1,
                })),
              },
            },
          },
        })
      );
    });

    const run = (pageSize = 100, pagesToRun?: number) =>
      collectPages(
        calculateBaseEntityScores({
          esClient,
          crudClient,
          logger,
          createMissingEntities: false,
          ...baseParams,
          pageSize,
          sampledPages: { targetPageSize: 10, samplesPerPage: 3, pagesToRun },
        })
      );
    // The first ES|QL request is the entity count; the rest score pages.
    const scoringFilters = () =>
      jest
        .mocked(esClient.esql.query)
        .mock.calls.slice(1)
        .map(([request]) => request.filter);

    it('scores every page between the sampled bounds, with no discovery query per page', async () => {
      jest
        .mocked(esClient.esql.query)
        .mockResolvedValueOnce({ columns: [], values: [esqlRow('user:02')] })
        .mockResolvedValueOnce({ columns: [], values: [esqlRow('user:05')] });

      const pages = await run();

      expect(esClient.search).toHaveBeenCalledTimes(1);
      expect(scoringFilters()).toEqual([
        range({ gte: 'user:', lte: 'user:03' }),
        range({ gt: 'user:03', lte: 'user;' }),
      ]);
      expect(pages.map((page) => page.scores.map((score) => score.id_value))).toEqual([
        ['user:02'],
        ['user:05'],
      ]);
    });

    it('scores only the requested number of sampled pages, each profiled, when a test sets one', async () => {
      jest
        .mocked(esClient.esql.query)
        .mockResolvedValueOnce({ columns: [], values: [esqlRow('user:05')] });

      const pages = await run(100, 1);

      expect(scoringFilters()).toEqual([range({ gt: 'user:03', lte: 'user;' })]);
      expect(jest.mocked(esClient.esql.query).mock.calls[1][0]).toEqual(
        expect.objectContaining({ profile: true })
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('scoring 1 of 2 sampled pages')
      );
      expect(pages.map((page) => page.scores.map((score) => score.id_value))).toEqual([
        ['user:05'],
      ]);
    });

    it('scores a page again in two halves, split at its middle sampled ID, when it reaches the row limit', async () => {
      jest
        .mocked(esClient.esql.query)
        .mockResolvedValueOnce({ columns: [], values: [esqlRow('user:01'), esqlRow('user:03')] })
        .mockResolvedValueOnce({ columns: [], values: [esqlRow('user:01')] })
        .mockResolvedValueOnce({ columns: [], values: [esqlRow('user:03')] })
        .mockResolvedValueOnce({ columns: [], values: [esqlRow('user:05')] });

      const pages = await run(2);

      expect(scoringFilters()).toEqual([
        range({ gte: 'user:', lte: 'user:03' }),
        range({ gte: 'user:', lte: 'user:01' }),
        range({ gt: 'user:01', lte: 'user:03' }),
        range({ gt: 'user:03', lte: 'user;' }),
      ]);
      expect(pages.map((page) => page.scores.map((score) => score.id_value))).toEqual([
        ['user:01', 'user:03'],
        ['user:05'],
      ]);
    });
  });

  describe('when some alerts have no stamped EUID', () => {
    it('derives EUIDs with the runtime mapping and reads every alert in range', async () => {
      mockCompositeAggPage(esClient, ['user:a@okta']);
      (esClient.esql.query as jest.Mock).mockResolvedValueOnce({
        values: [esqlRow('user:a@okta')],
      });

      await collectPages(
        calculateBaseEntityScores({
          esClient,
          crudClient,
          logger,
          createMissingEntities: false,
          ...baseParams,
        })
      );

      const compositeCall = (esClient.search as jest.Mock).mock.calls[0][0];
      expect(compositeCall.runtime_mappings.entity_id).toBeDefined();
      const [{ filter }] = (esClient.esql.query as jest.Mock).mock.calls[0];
      expect(filter).toEqual({ bool: { filter: baseParams.alertFilters } });
    });
  });

  describe('scoreBaseEntities not_in_store filter', () => {
    const buildWriter = (): RiskEngineDataWriter =>
      ({
        bulk: jest
          .fn<Promise<{ errors: never[]; docs_written: number; took: number }>, [unknown]>()
          .mockImplementation(async (params) => {
            const [scoresArr] = Object.values(params as Record<string, unknown[]>);
            return { errors: [], docs_written: scoresArr.length, took: 1 };
          }),
      } as unknown as RiskEngineDataWriter);

    it('drops scores whose entity_id is not in the entity store before persistence', async () => {
      // Composite agg + ES|QL produce two scored entities; one is in store, one is not. The
      // entity store knows only `user:in-store@okta`. The phantom is alert-only.
      mockCompositeAggPage(esClient, ['user:in-store@okta', 'user:phantom@okta']);
      (esClient.esql.query as jest.Mock).mockResolvedValueOnce(
        esqlPageWithStore([
          ['user:in-store@okta', {}],
          ['user:phantom@okta', null],
        ])
      );

      const writer = buildWriter();

      const summary = await scoreBaseEntities({
        esClient,
        crudClient,
        logger,
        writer,
        idBasedRiskScoringEnabled: false,
        createMissingEntities: false,
        ...baseParams,
      });

      // Only the in-store entity reached the writer.
      expect(writer.bulk).toHaveBeenCalledTimes(1);
      const writtenScores = (writer.bulk as jest.Mock).mock.calls[0][0][EntityType.user];
      expect(writtenScores).toHaveLength(1);
      expect(writtenScores[0].id_value).toBe('user:in-store@okta');

      expect(summary.scoresWrittenRiskIndex).toBe(1);
      expect(summary.scoresWrittenEntityStore).toBe(0);
      expect(summary.scoresCalculated).toBe(2);
      expect(summary.scoresDroppedNotInStore).toBe(1);
      expect(summary.scoresMissingFromStore).toBe(1);
      expect(summary.scoresFailed).toBe(0);
      expect(summary.entitiesCreated).toBe(0);
      expect(summary.entityCreationsSkipped).toBe(0);
      expect(summary.entityCreationsFailed).toBe(0);
    });

    describe('with skipUnchangedStoreWrites', () => {
      // Scores the page once to learn what the store would hold after writing it.
      const scoreOnce = async () => {
        mockCompositeAggPage(esClient, ['user:a@okta']);
        (esClient.esql.query as jest.Mock).mockResolvedValueOnce(
          esqlPageWithStore([['user:a@okta', {}]])
        );
        const writer = buildWriter();
        await scoreBaseEntities({
          esClient,
          crudClient,
          logger,
          writer,
          idBasedRiskScoringEnabled: true,
          createMissingEntities: false,
          ...baseParams,
        });
        const [written] = (writer.bulk as jest.Mock).mock.calls[0][0][EntityType.user];
        jest.clearAllMocks();
        return written;
      };

      const rescore = async (store: StoreDoc) => {
        mockCompositeAggPage(esClient, ['user:a@okta']);
        (esClient.esql.query as jest.Mock).mockResolvedValueOnce(
          esqlPageWithStore([['user:a@okta', store]])
        );
        const writer = buildWriter();
        const summary = await scoreBaseEntities({
          esClient,
          crudClient,
          logger,
          writer,
          idBasedRiskScoringEnabled: true,
          createMissingEntities: false,
          skipUnchangedStoreWrites: true,
          ...baseParams,
        });
        return { writer, summary };
      };

      it('leaves a score the store already holds out of the store write, but not the risk index', async () => {
        const written = await scoreOnce();

        // The store keeps scores as `float`, so it returns them rounded to single precision.
        const { writer, summary } = await rescore({
          level: written.calculated_level,
          score: Math.fround(written.calculated_score),
          scoreNorm: Math.fround(written.calculated_score_norm),
        });

        expect(writer.bulk).toHaveBeenCalledTimes(1);
        expect(summary.scoresWrittenRiskIndex).toBe(1);
        expect(crudClient.bulkUpdateEntity).not.toHaveBeenCalled();
        expect(summary.scoresUnchangedInStore).toBe(1);
      });

      it('writes a score that differs from the one in the store', async () => {
        const written = await scoreOnce();

        const { summary } = await rescore({
          level: written.calculated_level,
          score: Math.fround(written.calculated_score) + 1,
          scoreNorm: Math.fround(written.calculated_score_norm),
        });

        expect(crudClient.bulkUpdateEntity).toHaveBeenCalledTimes(1);
        expect(summary.scoresUnchangedInStore).toBe(0);
      });
    });

    // Root cause of https://github.com/elastic/kibana/issues/280414.
    //
    // After an asset criticality change the flyout asks the risk engine to score
    // that one entity, which comes through here. If the entity has no alert in
    // the engine's lookback, the composite agg finds nothing, so no score is
    // written and the old one stays in place with the old criticality on it.
    // `scoresWrittenRiskIndex: 0` is what `recalculateEntityRiskScore` reads to
    // decide it needs `persistZeroBaseScore` instead.
    it('reports a successful run with nothing written when the entity has no alerts in range', async () => {
      mockCompositeAggPage(esClient, []);

      const writer = buildWriter();

      const summary = await scoreBaseEntities({
        esClient,
        crudClient,
        logger,
        writer,
        idBasedRiskScoringEnabled: true,
        createMissingEntities: false,
        ...baseParams,
      });

      expect(esClient.esql.query as jest.Mock).not.toHaveBeenCalled();
      expect(writer.bulk).not.toHaveBeenCalled();
      expect(summary).toEqual(
        expect.objectContaining({
          pagesProcessed: 0,
          scoresCalculated: 0,
          scoresWrittenRiskIndex: 0,
          scoresWrittenEntityStore: 0,
          scoresFailed: 0,
        })
      );
    });

    it('writes no scores when no entity on the page is in the entity store', async () => {
      // Entity store has nothing for this page.
      mockCompositeAggPage(esClient, ['user:phantom-a@okta', 'user:phantom-b@okta']);
      (esClient.esql.query as jest.Mock).mockResolvedValueOnce(
        esqlPageWithStore([
          ['user:phantom-a@okta', null],
          ['user:phantom-b@okta', null],
        ])
      );

      const writer = buildWriter();

      const summary = await scoreBaseEntities({
        esClient,
        crudClient,
        logger,
        writer,
        idBasedRiskScoringEnabled: false,
        createMissingEntities: false,
        ...baseParams,
      });

      const writtenScores = (writer.bulk as jest.Mock).mock.calls[0][0][EntityType.user];
      expect(writtenScores).toHaveLength(0);
      expect(summary.scoresWrittenRiskIndex).toBe(0);
      expect(summary.scoresWrittenEntityStore).toBe(0);
      expect(summary.scoresCalculated).toBe(2);
      expect(summary.scoresDroppedNotInStore).toBe(2);
      expect(summary.scoresMissingFromStore).toBe(2);
      expect(summary.scoresFailed).toBe(0);
      expect(summary.entitiesCreated).toBe(0);
      expect(summary.entityCreationsSkipped).toBe(0);
      expect(summary.entityCreationsFailed).toBe(0);
    });
  });

  describe('scoreBaseEntities create-if-missing path', () => {
    const buildWriter = (): RiskEngineDataWriter =>
      ({
        bulk: jest
          .fn<Promise<{ errors: never[]; docs_written: number; took: number }>, [unknown]>()
          .mockImplementation(async (params) => {
            const [scoresArr] = Object.values(params as Record<string, unknown[]>);
            return { errors: [], docs_written: scoresArr.length, took: 1 };
          }),
      } as unknown as RiskEngineDataWriter);

    beforeEach(() => {
      crudClient = {
        listEntities: jest.fn(),
        createEntitiesFromSource: jest.fn(),
        bulkUpdateEntity: jest.fn().mockResolvedValue([]),
        latestIndexName: jest.fn().mockResolvedValue(ENTITY_STORE_INDEX),
      } as unknown as EntityUpdateClient;
      (crudClient.listEntities as jest.Mock).mockResolvedValue({
        entities: [],
        nextSearchAfter: undefined,
      });
    });

    it('creates a missing entity and writes its score to the risk index but not the entity store', async () => {
      mockCompositeAggPage(esClient, ['user:new@okta']);
      (esClient.esql.query as jest.Mock).mockResolvedValueOnce({
        values: [esqlRow('user:new@okta')],
      });
      // fetchAlertIdentityDocs's terms+top_hits lookup for the missing EUID.
      (esClient.search as jest.Mock).mockResolvedValueOnce({
        aggregations: {
          by_entity_id: {
            buckets: [
              {
                key: 'user:new@okta',
                latest: { hits: { hits: [{ _source: { user: { name: 'new' } } }] } },
                first_seen: { value_as_string: '2026-01-01T00:00:00.000Z' },
              },
            ],
          },
        },
      });
      (crudClient.createEntitiesFromSource as jest.Mock).mockResolvedValue({
        created: ['user:new@okta'],
        alreadyExists: [],
        skipped: [],
        failed: [],
      });

      const writer = buildWriter();

      const summary = await scoreBaseEntities({
        esClient,
        crudClient,
        logger,
        writer,
        idBasedRiskScoringEnabled: true,
        createMissingEntities: true,
        ...baseParams,
      });

      expect(writer.bulk).toHaveBeenCalledTimes(1);
      const writtenScores = (writer.bulk as jest.Mock).mock.calls[0][0][EntityType.user];
      expect(writtenScores).toHaveLength(1);
      expect(writtenScores[0].id_value).toBe('user:new@okta');

      // Created entities carry entity.risk.* already, so no redundant entity-store update.
      expect(crudClient.bulkUpdateEntity).not.toHaveBeenCalled();

      expect(summary.scoresWrittenRiskIndex).toBe(1);
      expect(summary.scoresMissingFromStore).toBe(1);
      expect(summary.scoresDroppedNotInStore).toBe(0);
      expect(summary.entitiesCreated).toBe(1);
      expect(summary.entityCreationsSkipped).toBe(0);
      expect(summary.entityCreationsFailed).toBe(0);
    });

    it('routes a 409 race to the entity store update path in addition to the risk index', async () => {
      mockCompositeAggPage(esClient, ['user:raced@okta']);
      (esClient.esql.query as jest.Mock).mockResolvedValueOnce({
        values: [esqlRow('user:raced@okta')],
      });
      (esClient.search as jest.Mock).mockResolvedValueOnce({
        aggregations: {
          by_entity_id: {
            buckets: [
              {
                key: 'user:raced@okta',
                latest: { hits: { hits: [{ _source: { user: { name: 'raced' } } }] } },
                first_seen: { value_as_string: '2026-01-01T00:00:00.000Z' },
              },
            ],
          },
        },
      });
      (crudClient.createEntitiesFromSource as jest.Mock).mockResolvedValue({
        created: [],
        alreadyExists: ['user:raced@okta'],
        skipped: [],
        failed: [],
      });

      const writer = buildWriter();

      const summary = await scoreBaseEntities({
        esClient,
        crudClient,
        logger,
        writer,
        idBasedRiskScoringEnabled: true,
        createMissingEntities: true,
        ...baseParams,
      });

      const writtenScores = (writer.bulk as jest.Mock).mock.calls[0][0][EntityType.user];
      expect(writtenScores).toHaveLength(1);
      expect(crudClient.bulkUpdateEntity).toHaveBeenCalledTimes(1);

      expect(summary.scoresMissingFromStore).toBe(1);
      expect(summary.scoresDroppedNotInStore).toBe(0);
      expect(summary.entitiesCreated).toBe(0);
      expect(summary.entityCreationsSkipped).toBe(0);
      expect(summary.entityCreationsFailed).toBe(0);
    });

    it('drops policy-rejected candidates and counts them, without writing anything for them', async () => {
      mockCompositeAggPage(esClient, ['user:rejected@okta']);
      (esClient.esql.query as jest.Mock).mockResolvedValueOnce({
        values: [esqlRow('user:rejected@okta')],
      });
      (esClient.search as jest.Mock).mockResolvedValueOnce({
        aggregations: {
          by_entity_id: {
            buckets: [
              {
                key: 'user:rejected@okta',
                latest: { hits: { hits: [{ _source: { user: { name: 'rejected' } } }] } },
                first_seen: { value_as_string: '2026-01-01T00:00:00.000Z' },
              },
            ],
          },
        },
      });
      (crudClient.createEntitiesFromSource as jest.Mock).mockResolvedValue({
        created: [],
        alreadyExists: [],
        skipped: [{ euid: 'user:rejected@okta', reason: 'user_not_local_namespace' }],
        failed: [],
      });

      const writer = buildWriter();

      const summary = await scoreBaseEntities({
        esClient,
        crudClient,
        logger,
        writer,
        idBasedRiskScoringEnabled: true,
        createMissingEntities: true,
        ...baseParams,
      });

      const writtenScores = (writer.bulk as jest.Mock).mock.calls[0][0][EntityType.user];
      expect(writtenScores).toHaveLength(0);
      expect(summary.scoresMissingFromStore).toBe(1);
      expect(summary.scoresDroppedNotInStore).toBe(1);
      expect(summary.entitiesCreated).toBe(0);
      expect(summary.entityCreationsSkipped).toBe(1);
      expect(summary.entityCreationsFailed).toBe(0);
    });

    it('counts a write failure (e.g. euid_mismatch) as failed, not skipped', async () => {
      mockCompositeAggPage(esClient, ['user:mismatched@okta']);
      (esClient.esql.query as jest.Mock).mockResolvedValueOnce({
        values: [esqlRow('user:mismatched@okta')],
      });
      (esClient.search as jest.Mock).mockResolvedValueOnce({
        aggregations: {
          by_entity_id: {
            buckets: [
              {
                key: 'user:mismatched@okta',
                latest: { hits: { hits: [{ _source: { user: { name: 'mismatched' } } }] } },
                first_seen: { value_as_string: '2026-01-01T00:00:00.000Z' },
              },
            ],
          },
        },
      });
      (crudClient.createEntitiesFromSource as jest.Mock).mockResolvedValue({
        created: [],
        alreadyExists: [],
        skipped: [],
        failed: [{ euid: 'user:mismatched@okta', reason: 'euid_mismatch' }],
      });

      const writer = buildWriter();

      const summary = await scoreBaseEntities({
        esClient,
        crudClient,
        logger,
        writer,
        idBasedRiskScoringEnabled: true,
        createMissingEntities: true,
        ...baseParams,
      });

      const writtenScores = (writer.bulk as jest.Mock).mock.calls[0][0][EntityType.user];
      expect(writtenScores).toHaveLength(0);
      expect(summary.scoresMissingFromStore).toBe(1);
      expect(summary.scoresDroppedNotInStore).toBe(1);
      expect(summary.entitiesCreated).toBe(0);
      expect(summary.entityCreationsSkipped).toBe(0);
      expect(summary.entityCreationsFailed).toBe(1);
    });

    it('restores the pre-existing drop behaviour when the kill switch is off', async () => {
      mockCompositeAggPage(esClient, ['user:phantom@okta']);
      (esClient.esql.query as jest.Mock).mockResolvedValueOnce({
        values: [esqlRow('user:phantom@okta')],
      });

      const writer = buildWriter();

      const summary = await scoreBaseEntities({
        esClient,
        crudClient,
        logger,
        writer,
        idBasedRiskScoringEnabled: true,
        createMissingEntities: false,
        ...baseParams,
      });

      expect(esClient.search as jest.Mock).toHaveBeenCalledTimes(1); // composite agg page only
      expect(crudClient.createEntitiesFromSource).not.toHaveBeenCalled();
      const writtenScores = (writer.bulk as jest.Mock).mock.calls[0][0][EntityType.user];
      expect(writtenScores).toHaveLength(0);
      expect(summary.scoresMissingFromStore).toBe(1);
      expect(summary.scoresDroppedNotInStore).toBe(1);
      expect(summary.entitiesCreated).toBe(0);
      expect(summary.entityCreationsSkipped).toBe(0);
      expect(summary.entityCreationsFailed).toBe(0);
    });
  });

  // Second half of the fix for https://github.com/elastic/kibana/issues/280414. When the
  // alert-driven pass writes nothing, this puts a fresh score in place so the entity's current
  // criticality lands on it instead of the row keeping the old level.
  describe('persistZeroBaseScore', () => {
    const buildWriter = (): RiskEngineDataWriter =>
      ({
        bulk: jest.fn().mockImplementation(async (params) => {
          const [scoresArr] = Object.values(params as Record<string, unknown[]>);
          return { errors: [], docs_written: scoresArr.length, took: 1 };
        }),
      } as unknown as RiskEngineDataWriter);

    const zeroScoreParams = {
      entityType: EntityType.user,
      entityId: 'user:a@okta',
      now: baseParams.now,
      watchlistConfigs: baseParams.watchlistConfigs,
      calculationRunId: baseParams.calculationRunId,
      idBasedRiskScoringEnabled: true,
    };

    it('writes a zero score carrying the criticality on the entity record', async () => {
      (crudClient.listEntities as jest.Mock).mockResolvedValue({
        entities: [
          {
            entity: { id: 'user:a@okta', attributes: { watchlists: [] } },
            asset: { criticality: 'extreme_impact' },
          },
        ],
        nextSearchAfter: undefined,
      });

      const writer = buildWriter();

      const written = await persistZeroBaseScore({
        crudClient,
        logger,
        writer,
        ...zeroScoreParams,
      });

      expect(written).toBe(1);
      const [score] = (writer.bulk as jest.Mock).mock.calls[0][0][EntityType.user];
      expect(score.id_field).toBe('entity.id');
      expect(score.id_value).toBe('user:a@okta');
      expect(score.calculated_score_norm).toBe(0);
      expect(score.category_1_count).toBe(0);
      // The current level, with a contribution of 0 because there are no alerts for it to lift.
      expect(score.modifiers).toEqual([
        expect.objectContaining({
          type: 'asset_criticality',
          contribution: 0,
          metadata: expect.objectContaining({ criticality_level: 'extreme_impact' }),
        }),
      ]);
    });

    it('writes nothing when the entity is missing from the store', async () => {
      // Writing here would replace a score that has modifiers with one that has none.
      (crudClient.listEntities as jest.Mock).mockResolvedValue({
        entities: [],
        nextSearchAfter: undefined,
      });

      const writer = buildWriter();

      const written = await persistZeroBaseScore({
        crudClient,
        logger,
        writer,
        ...zeroScoreParams,
      });

      expect(written).toBe(0);
      expect(writer.bulk).not.toHaveBeenCalled();
    });
  });
});
