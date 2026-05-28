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
import { calculateBaseEntityScores } from './score_base_entities';
import type { ScopedLogger } from '../utils/with_log_context';

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
  lookupIndex: '.entity_analytics.risk_score.lookup-default',
  propagationEnabled: false,
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

const lookupHit = (entityId: string) => ({ _source: { entity_id: entityId } });

const mockLookupPage = (esClient: ElasticsearchClient, entityIds: string[]) => {
  (esClient.search as jest.Mock).mockImplementationOnce(async () => ({
    hits: { hits: entityIds.map(lookupHit) },
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

  it('terminates after a single page when the lookup page is not full', async () => {
    mockLookupPage(esClient, ['user:a@okta']);
    (esClient.esql.query as jest.Mock).mockResolvedValueOnce({
      values: [esqlRow('user:a@okta')],
    });

    await collectPages(calculateBaseEntityScores({ esClient, crudClient, logger, ...baseParams }));

    expect(esClient.search as jest.Mock).toHaveBeenCalledTimes(1);
    expect(esClient.esql.query as jest.Mock).toHaveBeenCalledTimes(1);

    const lookupCall = (esClient.search as jest.Mock).mock.calls[0][0];
    expect(lookupCall.index).toBe(baseParams.lookupIndex);
    expect(lookupCall.search_after).toBeUndefined();
    expect(lookupCall.query).toEqual({ prefix: { entity_id: 'user:' } });

    const esqlQuery = (esClient.esql.query as jest.Mock).mock.calls[0][0].query as string;
    expect(esqlQuery).toContain('WHERE entity_id IN ("user:a@okta")');
  });

  it('uses the propagation-aware base query when propagation is enabled', async () => {
    mockLookupPage(esClient, ['user:a@okta']);
    (esClient.esql.query as jest.Mock).mockResolvedValueOnce({
      values: [esqlRow('user:a@okta')],
    });

    await collectPages(
      calculateBaseEntityScores({
        esClient,
        crudClient,
        logger,
        ...baseParams,
        propagationEnabled: true,
      })
    );

    const esqlQuery = (esClient.esql.query as jest.Mock).mock.calls[0][0].query as string;
    expect(esqlQuery).toContain('LOOKUP JOIN');
    expect(esqlQuery).toContain('MV_EXPAND all_targets');
  });

  it('paginates the lookup index by entity_id cursor when pages are full', async () => {
    const fullPage = Array.from(
      { length: baseParams.pageSize },
      (_, i) => `user:${i.toString().padStart(3, '0')}@okta`
    );
    mockLookupPage(esClient, fullPage);
    mockLookupPage(esClient, ['user:zzz@okta']);

    (esClient.esql.query as jest.Mock)
      .mockResolvedValueOnce({ values: fullPage.map(esqlRow) })
      .mockResolvedValueOnce({ values: [esqlRow('user:zzz@okta')] });

    await collectPages(calculateBaseEntityScores({ esClient, crudClient, logger, ...baseParams }));

    expect(esClient.search as jest.Mock).toHaveBeenCalledTimes(2);
    const secondLookupCall = (esClient.search as jest.Mock).mock.calls[1][0];
    expect(secondLookupCall.search_after).toEqual([fullPage[fullPage.length - 1]]);
  });

  it('does not produce another ES|QL call when the abort signal fires between pages', async () => {
    const controller = new AbortController();
    const fullPage = Array.from({ length: baseParams.pageSize }, (_, i) => `user:${i}@okta`);
    mockLookupPage(esClient, fullPage);

    (esClient.esql.query as jest.Mock).mockImplementationOnce(async () => {
      controller.abort();
      return { values: fullPage.map(esqlRow) };
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
    // Lookup returns three IDs but only two get scored.
    mockLookupPage(esClient, ['user:a@okta', 'user:b@okta', 'user:c@okta']);
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
});
