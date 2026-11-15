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
import type { EntityRiskScoreRecord } from '../../../../../../common/api/entity_analytics/common';
import { RiskEngineDataWriter } from '../../risk_engine_data_writer';
import { riskScoreServiceMock } from '../../risk_score_service.mock';
import { runResolutionScoringStep } from './run_resolution_scoring_step';
import {
  buildZeroResolutionScores,
  calculateResolutionEntityScores,
} from './score_resolution_entities';
import { persistScoresToEntityStore, persistScoresToRiskIndex } from './persist_scores';

jest.mock('./score_resolution_entities');
jest.mock('./persist_scores');

async function* toAsyncGenerator<T>(pages: T[]) {
  for (const page of pages) {
    yield page;
  }
}

async function* scorePages(
  pages: EntityRiskScoreRecord[][]
): AsyncGenerator<EntityRiskScoreRecord[], number> {
  for (const page of pages) {
    yield page;
  }
  return pages.length;
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
      alertFilters: [],
    });

    expect(calculateResolutionEntityScores).toHaveBeenCalledWith(
      expect.objectContaining({
        abortSignal: abortController.signal,
        alertFilters: [],
      })
    );
    expect(result).toEqual({
      scoresWrittenRiskIndex: 0,
      scoresWrittenEntityStore: 0,
      scoresFailed: 0,
      pagesProcessed: 0,
      skippedReason: undefined,
      scores: {},
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
      alertFilters: [],
    });

    expect(result).toEqual({
      scoresWrittenRiskIndex: 0,
      scoresWrittenEntityStore: 0,
      scoresFailed: 0,
      pagesProcessed: 0,
      skippedReason: 'lookup_empty',
      scores: {},
    });
  });

  describe('zero resolution scores', () => {
    const TARGET_ID = 'host:target-1';
    const OTHER_TARGET_ID = 'host:target-2';
    const zeroScore = riskScoreServiceMock.createRiskScore({
      id_value: TARGET_ID,
      calculated_score: 0,
      calculated_score_norm: 0,
    });

    const run = (overrides: Partial<Parameters<typeof runResolutionScoringStep>[0]> = {}) =>
      runResolutionScoringStep({
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
        writer: new RiskEngineDataWriter({
          esClient,
          index: 'risk-score.risk-score-default',
          namespace: 'default',
          logger,
        }),
        targetEntityIds: [TARGET_ID],
        alertFilters: [],
        refresh: 'wait_for',
        collectScores: true,
        ...overrides,
      });

    beforeEach(() => {
      jest.mocked(buildZeroResolutionScores).mockResolvedValue([zeroScore]);
    });

    it('writes a zero for a target whose group had nothing to score', async () => {
      jest.mocked(calculateResolutionEntityScores).mockReturnValue(scorePages([[]]));
      jest.mocked(persistScoresToRiskIndex).mockResolvedValue(1);

      const result = await run();

      expect(buildZeroResolutionScores).toHaveBeenCalledWith(
        expect.objectContaining({
          resolutionTargetIds: [TARGET_ID],
          lookupIndex: '.entity_analytics.risk_score.lookup-default',
        })
      );
      expect(persistScoresToRiskIndex).toHaveBeenCalledWith(
        expect.objectContaining({ scores: [zeroScore], refresh: 'wait_for' })
      );
      expect(persistScoresToEntityStore).toHaveBeenCalledWith(
        expect.objectContaining({ scores: [zeroScore], enabled: true })
      );
      // The zero has no related entities, so the API reports no resolution score, as before.
      expect(result).toEqual(expect.objectContaining({ scoresWrittenRiskIndex: 1, scores: {} }));
    });

    it('asks for zeros only for the targets that got no score', async () => {
      jest
        .mocked(calculateResolutionEntityScores)
        .mockReturnValue(
          scorePages([[riskScoreServiceMock.createRiskScore({ id_value: TARGET_ID })]])
        );

      await run({ targetEntityIds: [TARGET_ID, OTHER_TARGET_ID] });

      expect(buildZeroResolutionScores).toHaveBeenCalledWith(
        expect.objectContaining({ resolutionTargetIds: [OTHER_TARGET_ID] })
      );
    });

    it('writes no zero when the target scored but the write failed', async () => {
      // Zeroing here would drop the score of a group that does have alerts.
      jest
        .mocked(calculateResolutionEntityScores)
        .mockReturnValue(
          scorePages([[riskScoreServiceMock.createRiskScore({ id_value: TARGET_ID })]])
        );
      jest.mocked(persistScoresToRiskIndex).mockResolvedValue(0);

      await run();

      expect(buildZeroResolutionScores).not.toHaveBeenCalled();
    });

    it('writes no zero in a full run, which leaves stale scores to resetToZero', async () => {
      jest.mocked(calculateResolutionEntityScores).mockReturnValue(scorePages([[]]));

      await run({ targetEntityIds: undefined });

      expect(buildZeroResolutionScores).not.toHaveBeenCalled();
    });

    it('writes no zero when the lookup holds no group for the target', async () => {
      jest.mocked(calculateResolutionEntityScores).mockReturnValue(scorePages([]));

      await run();

      expect(buildZeroResolutionScores).not.toHaveBeenCalled();
    });

    it('writes no zero when the run is aborted', async () => {
      const abortController = new AbortController();
      abortController.abort();
      jest.mocked(calculateResolutionEntityScores).mockReturnValue(scorePages([[]]));

      await run({ abortSignal: abortController.signal });

      expect(buildZeroResolutionScores).not.toHaveBeenCalled();
    });

    it('keeps the previous score when building the zero fails', async () => {
      jest.mocked(calculateResolutionEntityScores).mockReturnValue(scorePages([[]]));
      jest.mocked(buildZeroResolutionScores).mockRejectedValue(new Error('lookup unavailable'));

      const result = await run();

      expect(persistScoresToRiskIndex).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('lookup unavailable'));
      expect(result).toEqual(
        expect.objectContaining({ scoresWrittenRiskIndex: 0, pagesProcessed: 1 })
      );
    });
  });
});
