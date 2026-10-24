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
  discoverResolutionPages,
  scoreResolutionPage,
} from './score_resolution_entities';
import { persistScoresToEntityStore, persistScoresToRiskIndex } from './persist_scores';
import { createPageStepTimings } from '../utils/page_step_timings';

jest.mock('./score_resolution_entities');
jest.mock('./persist_scores');

// Each inner array is the scores one page of resolution targets produces.
const mockPages = (pages: EntityRiskScoreRecord[][]) => {
  const timings = createPageStepTimings();
  jest.mocked(discoverResolutionPages).mockImplementation(async function* () {
    for (let index = 0; index < pages.length; index++) {
      yield {
        pageNumber: index + 1,
        resolutionTargetIds: [],
        bounds: undefined,
        timer: timings.startPage(),
      };
    }
  });
  jest.mocked(scoreResolutionPage).mockImplementation(async (_params, { pageNumber }) => ({
    scores: pages[pageNumber - 1],
    unchangedInStore: new Set(),
  }));
};

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
    mockPages([[]]);

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

    expect(discoverResolutionPages).toHaveBeenCalledWith(
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
      scoresUnchangedInStore: 0,
    });
  });

  it('reports lookup_empty when no lookup pages are returned', async () => {
    mockPages([]);

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
      scoresUnchangedInStore: 0,
    });
  });

  describe('unchanged resolution scores', () => {
    const changed = riskScoreServiceMock.createRiskScore({ id_value: 'host:changed' });
    const unchanged = riskScoreServiceMock.createRiskScore({ id_value: 'host:unchanged' });

    const runFullPage = (skipUnchangedStoreWrites: boolean) => {
      const timings = createPageStepTimings();
      jest.mocked(discoverResolutionPages).mockImplementation(async function* () {
        yield {
          pageNumber: 1,
          resolutionTargetIds: [],
          bounds: undefined,
          timer: timings.startPage(),
        };
      });
      jest.mocked(scoreResolutionPage).mockResolvedValue({
        scores: [changed, unchanged],
        unchangedInStore: new Set(['host:unchanged']),
      });
      jest.mocked(persistScoresToRiskIndex).mockResolvedValue(2);
      return runResolutionScoringStep({
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
        alertFilters: [],
        skipUnchangedStoreWrites,
      });
    };

    it('leaves scores the store already holds out of the store write, not the risk index', async () => {
      const result = await runFullPage(true);

      expect(jest.mocked(persistScoresToRiskIndex).mock.calls[0][0].scores).toEqual([
        changed,
        unchanged,
      ]);
      expect(jest.mocked(persistScoresToEntityStore).mock.calls[0][0].scores).toEqual([changed]);
      expect(result.scoresUnchangedInStore).toBe(1);
    });

    it('writes every score to the store when the setting is off', async () => {
      const result = await runFullPage(false);

      expect(jest.mocked(persistScoresToEntityStore).mock.calls[0][0].scores).toEqual([
        changed,
        unchanged,
      ]);
      expect(result.scoresUnchangedInStore).toBe(0);
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
      mockPages([[]]);
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
      mockPages([[riskScoreServiceMock.createRiskScore({ id_value: TARGET_ID })]]);

      await run({ targetEntityIds: [TARGET_ID, OTHER_TARGET_ID] });

      expect(buildZeroResolutionScores).toHaveBeenCalledWith(
        expect.objectContaining({ resolutionTargetIds: [OTHER_TARGET_ID] })
      );
    });

    it('writes no zero when the target scored but the write failed', async () => {
      // Zeroing here would drop the score of a group that does have alerts.
      mockPages([[riskScoreServiceMock.createRiskScore({ id_value: TARGET_ID })]]);
      jest.mocked(persistScoresToRiskIndex).mockResolvedValue(0);

      await run();

      expect(buildZeroResolutionScores).not.toHaveBeenCalled();
    });

    it('writes no zero in a full run, which leaves stale scores to resetToZero', async () => {
      mockPages([[]]);

      await run({ targetEntityIds: undefined });

      expect(buildZeroResolutionScores).not.toHaveBeenCalled();
    });

    it('writes no zero when the lookup holds no group for the target', async () => {
      mockPages([]);

      await run();

      expect(buildZeroResolutionScores).not.toHaveBeenCalled();
    });

    it('writes no zero when the run is aborted', async () => {
      const abortController = new AbortController();
      abortController.abort();
      mockPages([[]]);

      await run({ abortSignal: abortController.signal });

      expect(buildZeroResolutionScores).not.toHaveBeenCalled();
    });

    it('keeps the previous score when building the zero fails', async () => {
      mockPages([[]]);
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
