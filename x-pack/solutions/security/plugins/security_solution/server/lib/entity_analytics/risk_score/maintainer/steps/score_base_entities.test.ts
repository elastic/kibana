/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { EntityUpdateClient } from '@kbn/entity-store/server';
import { EntityType } from '../../../../../../common/entity_analytics/types';
import { calculateBaseEntityScores, scoreBaseEntities } from './score_base_entities';
import type { ScopedLogger } from '../utils/with_log_context';
import type { RiskEngineDataWriter } from '../../risk_engine_data_writer';

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
    crudClient = { listEntities: jest.fn() } as unknown as EntityUpdateClient;
    logger = buildLogger();
    (crudClient.listEntities as jest.Mock).mockResolvedValue({
      entities: [],
      nextSearchAfter: undefined,
    });
  });

  it('terminates after a single page when the composite agg has no after_key', async () => {
    mockCompositeAggPage(esClient, ['user:a@okta']);
    (esClient.esql.query as jest.Mock).mockResolvedValueOnce({
      values: [esqlRow('user:a@okta')],
    });

    await collectPages(calculateBaseEntityScores({ esClient, crudClient, logger, ...baseParams }));

    expect(esClient.search as jest.Mock).toHaveBeenCalledTimes(1);
    expect(esClient.esql.query as jest.Mock).toHaveBeenCalledTimes(1);

    const compositeCall = (esClient.search as jest.Mock).mock.calls[0][0];
    expect(compositeCall.index).toBe(baseParams.alertsIndex);
    expect(compositeCall.aggs.by_entity_id.composite.size).toBe(baseParams.pageSize);

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

    await collectPages(calculateBaseEntityScores({ esClient, crudClient, logger, ...baseParams }));

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
        ...baseParams,
        abortSignal: controller.signal,
      })
    );

    expect(esClient.esql.query as jest.Mock).toHaveBeenCalledTimes(1);
  });

  it('fetches modifier entities only for IDs that produced scores', async () => {
    // Composite agg returns three IDs but only two get scored.
    mockCompositeAggPage(esClient, ['user:a@okta', 'user:b@okta', 'user:c@okta']);
    (esClient.esql.query as jest.Mock).mockResolvedValueOnce({
      values: [esqlRow('user:a@okta'), esqlRow('user:b@okta')],
    });

    await collectPages(calculateBaseEntityScores({ esClient, crudClient, logger, ...baseParams }));

    expect(crudClient.listEntities as jest.Mock).toHaveBeenCalledTimes(1);
    const fetchArgs = (crudClient.listEntities as jest.Mock).mock.calls[0][0];
    expect(fetchArgs.filter).toEqual({
      terms: { 'entity.id': ['user:a@okta', 'user:b@okta'] },
    });
  });

  it('terminates without scoring when the composite agg returns zero buckets', async () => {
    mockCompositeAggPage(esClient, []);

    await collectPages(calculateBaseEntityScores({ esClient, crudClient, logger, ...baseParams }));

    expect(esClient.search as jest.Mock).toHaveBeenCalledTimes(1);
    expect(esClient.esql.query as jest.Mock).not.toHaveBeenCalled();
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

    const makeStoreEntity = (entityId: string) => ({
      entity: {
        id: entityId,
        attributes: { watchlists: [] },
        relationships: { resolution: { resolved_to: undefined } },
      },
      asset: { criticality: undefined },
    });

    it('drops scores whose entity_id is not in the entity store before persistence', async () => {
      // Composite agg + ES|QL produce two scored entities; one is in store, one is not.
      mockCompositeAggPage(esClient, ['user:in-store@okta', 'user:phantom@okta']);
      (esClient.esql.query as jest.Mock).mockResolvedValueOnce({
        values: [esqlRow('user:in-store@okta'), esqlRow('user:phantom@okta')],
      });

      // Entity store knows only `user:in-store@okta`. The phantom is alert-only.
      (crudClient.listEntities as jest.Mock).mockResolvedValue({
        entities: [makeStoreEntity('user:in-store@okta')],
        nextSearchAfter: undefined,
      });

      const writer = buildWriter();

      const summary = await scoreBaseEntities({
        esClient,
        crudClient,
        logger,
        writer,
        idBasedRiskScoringEnabled: false,
        ...baseParams,
      });

      // Only the in-store entity reached the writer.
      expect(writer.bulk).toHaveBeenCalledTimes(1);
      const writtenScores = (writer.bulk as jest.Mock).mock.calls[0][0][EntityType.user];
      expect(writtenScores).toHaveLength(1);
      expect(writtenScores[0].id_value).toBe('user:in-store@okta');

      expect(summary.scoresWritten).toBe(1);
    });

    it('writes no scores when no entity on the page is in the entity store', async () => {
      mockCompositeAggPage(esClient, ['user:phantom-a@okta', 'user:phantom-b@okta']);
      (esClient.esql.query as jest.Mock).mockResolvedValueOnce({
        values: [esqlRow('user:phantom-a@okta'), esqlRow('user:phantom-b@okta')],
      });

      // Entity store has nothing for this page.
      (crudClient.listEntities as jest.Mock).mockResolvedValue({
        entities: [],
        nextSearchAfter: undefined,
      });

      const writer = buildWriter();

      const summary = await scoreBaseEntities({
        esClient,
        crudClient,
        logger,
        writer,
        idBasedRiskScoringEnabled: false,
        ...baseParams,
      });

      const writtenScores = (writer.bulk as jest.Mock).mock.calls[0][0][EntityType.user];
      expect(writtenScores).toHaveLength(0);
      expect(summary.scoresWritten).toBe(0);
    });
  });
});
