/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { EntityUpdateClient } from '@kbn/entity-store/server';
import { EntityType } from '../../../../../../common/entity_analytics/types';
import type { RiskEngineDataWriter } from '../../risk_engine_data_writer';
import { runResolutionScoringStep } from './run_resolution_scoring_step';
import { calculateResolutionEntityScores } from './score_resolution_entities';
import { persistScoresToEntityStore, persistScoresToRiskIndex } from './persist_scores';

jest.mock('./score_resolution_entities');
jest.mock('./persist_scores');

async function* toAsyncGenerator<T>(pages: T[]) {
  for (const page of pages) {
    yield page;
  }
}

describe('runResolutionScoringStep', () => {
  let esClient: ElasticsearchClient;
  let crudClient: EntityUpdateClient;
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
    crudClient = {} as EntityUpdateClient;
    (persistScoresToRiskIndex as jest.Mock).mockResolvedValue(0);
    (persistScoresToEntityStore as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('does not report lookup_empty when aborted before first page is processed', async () => {
    const abortController = new AbortController();
    abortController.abort();
    (calculateResolutionEntityScores as jest.Mock).mockReturnValue(toAsyncGenerator([[]]));

    const result = await runResolutionScoringStep({
      esClient,
      crudClient,
      logger,
      entityType: EntityType.host,
      alertsIndex: '.alerts-security.alerts-default',
      lookupIndex: '.entity_analytics.risk_score.lookup-default',
      pageSize: 1000,
      sampleSize: 1000,
      now: '2026-01-01T00:00:00.000Z',
      calculationRunId: 'run-1',
      abortSignal: abortController.signal,
      watchlistConfigs: new Map(),
      idBasedRiskScoringEnabled: true,
      writer: {} as unknown as RiskEngineDataWriter,
    });

    expect(result).toEqual({
      scoresWritten: 0,
      pagesProcessed: 0,
      skippedReason: undefined,
    });
  });

  it('reports lookup_empty when no lookup pages are returned', async () => {
    (calculateResolutionEntityScores as jest.Mock).mockReturnValue(toAsyncGenerator([]));

    const result = await runResolutionScoringStep({
      esClient,
      crudClient,
      logger,
      entityType: EntityType.host,
      alertsIndex: '.alerts-security.alerts-default',
      lookupIndex: '.entity_analytics.risk_score.lookup-default',
      pageSize: 1000,
      sampleSize: 1000,
      now: '2026-01-01T00:00:00.000Z',
      calculationRunId: 'run-1',
      watchlistConfigs: new Map(),
      idBasedRiskScoringEnabled: true,
      writer: {} as unknown as RiskEngineDataWriter,
    });

    expect(result).toEqual({
      scoresWritten: 0,
      pagesProcessed: 0,
      skippedReason: 'lookup_empty',
    });
  });
});
