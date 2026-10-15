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
import {
  persistZeroResolutionScore,
  runResolutionScoringStep,
} from './run_resolution_scoring_step';
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
    (persistScoresToEntityStore as jest.Mock).mockResolvedValue({
      docsWritten: 0,
      errorsCount: 0,
    });
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

    expect(calculateResolutionEntityScores).toHaveBeenCalledWith(
      expect.objectContaining({
        abortSignal: abortController.signal,
      })
    );
    expect(result).toEqual({
      scoresWrittenRiskIndex: 0,
      scoresWrittenEntityStore: 0,
      scoresFailed: 0,
      pagesProcessed: 0,
      skippedReason: undefined,
      scores: {},
      scoresCalculated: 0,
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
      scoresWrittenRiskIndex: 0,
      scoresWrittenEntityStore: 0,
      scoresFailed: 0,
      pagesProcessed: 0,
      skippedReason: 'lookup_empty',
      scores: {},
      scoresCalculated: 0,
    });
  });

  it('counts calculated scores separately from written ones', async () => {
    // Single-entity recalculation decides whether to write a zero score from this count, so a
    // failed write must not look like a group with nothing to score.
    (calculateResolutionEntityScores as jest.Mock).mockReturnValue(
      toAsyncGenerator([[{ id_value: 'host:target-1', calculated_score_norm: 40 }]])
    );

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

    expect(result).toEqual(
      expect.objectContaining({ pagesProcessed: 1, scoresCalculated: 1, scoresWrittenRiskIndex: 0 })
    );
  });

  describe('persistZeroResolutionScore', () => {
    const zeroScoreParams = {
      entityType: EntityType.host,
      targetId: 'host:target-1',
      now: '2026-01-01T00:00:00.000Z',
      watchlistConfigs: new Map(),
      calculationRunId: 'run-1',
      writer: {} as unknown as RiskEngineDataWriter,
      idBasedRiskScoringEnabled: true,
    };

    it('writes a zero resolution score carrying the criticality on the target record', async () => {
      (persistScoresToRiskIndex as jest.Mock).mockResolvedValue(1);
      const listEntities = jest.fn().mockResolvedValue({
        entities: [
          {
            entity: { id: 'host:target-1', attributes: { watchlists: [] } },
            asset: { criticality: 'high_impact' },
          },
        ],
        nextSearchAfter: undefined,
      });

      const written = await persistZeroResolutionScore({
        crudClient: { listEntities } as unknown as EntityUpdateClient,
        logger,
        ...zeroScoreParams,
      });

      expect(written).toBe(1);
      const [{ scores }] = (persistScoresToRiskIndex as jest.Mock).mock.calls[0];
      expect(scores).toEqual([
        expect.objectContaining({
          id_value: 'host:target-1',
          score_type: 'resolution',
          calculated_score_norm: 0,
          modifiers: [
            expect.objectContaining({
              type: 'asset_criticality',
              contribution: 0,
              metadata: expect.objectContaining({ criticality_level: 'high_impact' }),
            }),
          ],
        }),
      ]);
      expect(persistScoresToEntityStore).toHaveBeenCalledWith(
        expect.objectContaining({ scores, enabled: true })
      );
    });

    it('writes nothing when the target is missing from the store', async () => {
      // Writing here would replace a score that has modifiers with one that has none.
      const listEntities = jest
        .fn()
        .mockResolvedValue({ entities: [], nextSearchAfter: undefined });

      const written = await persistZeroResolutionScore({
        crudClient: { listEntities } as unknown as EntityUpdateClient,
        logger,
        ...zeroScoreParams,
      });

      expect(written).toBe(0);
      expect(persistScoresToRiskIndex).not.toHaveBeenCalled();
      expect(persistScoresToEntityStore).not.toHaveBeenCalled();
    });
  });
});
