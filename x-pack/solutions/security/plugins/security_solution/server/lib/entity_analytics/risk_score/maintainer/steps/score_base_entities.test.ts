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
  pageSize: 100,
  sampleSize: 1000,
  now: '2026-01-01T00:00:00.000Z',
  watchlistConfigs: new Map(),
  calculationRunId: 'run-1',
};

// Build a fake ES|QL row in the column order parseEsqlBaseScoreRow expects:
// [alert_count, scores, risk_inputs, entity_id]
const esqlRow = (entityId: string) => [1, 0.5, '{"risk_score":"50","time":"2026-01-01T00:00:00.000Z","id":"a"}', entityId];

describe('score_base_entities', () => {
  let esClient: ElasticsearchClient;
  let crudClient: EntityUpdateClient;
  let logger: ScopedLogger;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
    crudClient = { listEntities: jest.fn() } as unknown as EntityUpdateClient;
    logger = buildLogger();
    (crudClient.listEntities as jest.Mock).mockResolvedValue({ entities: [], nextSearchAfter: undefined });
  });

  it('issues a single ES|QL call when the page is not full (terminates immediately)', async () => {
    (esClient.esql.query as jest.Mock).mockResolvedValueOnce({
      values: [esqlRow('user:a@okta')],
    });

    await collectPages(
      calculateBaseEntityScores({ esClient, crudClient, logger, ...baseParams })
    );

    expect(esClient.esql.query as jest.Mock).toHaveBeenCalledTimes(1);
    const firstQuery = (esClient.esql.query as jest.Mock).mock.calls[0][0].query as string;
    expect(firstQuery).not.toContain('WHERE entity_id >');
  });

  it('paginates via entity_id cursor when pages are full', async () => {
    (esClient.esql.query as jest.Mock)
      // page 1: full → continue
      .mockResolvedValueOnce({
        values: Array.from({ length: baseParams.pageSize }, (_, i) =>
          esqlRow(`user:${i.toString().padStart(3, '0')}@okta`)
        ),
      })
      // page 2: partial → terminate
      .mockResolvedValueOnce({ values: [esqlRow('user:zzz@okta')] });

    await collectPages(
      calculateBaseEntityScores({ esClient, crudClient, logger, ...baseParams })
    );

    expect(esClient.esql.query as jest.Mock).toHaveBeenCalledTimes(2);

    // Page 2's query must carry the cursor — last entity_id of page 1.
    const secondQuery = (esClient.esql.query as jest.Mock).mock.calls[1][0].query as string;
    expect(secondQuery).toContain('WHERE entity_id > "user:099@okta"');
  });

  it('does not produce another ES|QL call when the abort signal fires between pages', async () => {
    const controller = new AbortController();
    (esClient.esql.query as jest.Mock).mockImplementationOnce(async () => {
      controller.abort();
      return {
        values: Array.from({ length: baseParams.pageSize }, (_, i) =>
          esqlRow(`user:${i}@okta`)
        ),
      };
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
    (esClient.esql.query as jest.Mock).mockResolvedValueOnce({
      values: [esqlRow('user:a@okta'), esqlRow('user:b@okta')],
    });

    await collectPages(
      calculateBaseEntityScores({ esClient, crudClient, logger, ...baseParams })
    );

    expect(crudClient.listEntities as jest.Mock).toHaveBeenCalledTimes(1);
    const fetchArgs = (crudClient.listEntities as jest.Mock).mock.calls[0][0];
    expect(fetchArgs.filter).toEqual({
      terms: { 'entity.id': ['user:a@okta', 'user:b@okta'] },
    });
  });
});
