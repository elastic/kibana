/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { EntityUpdateClient } from '@kbn/entity-store/server';
import type { EntityType } from '../../../../../../common/entity_analytics/types';
import type { WatchlistObject } from '../../../../../../common/api/entity_analytics/watchlists/management/common.gen';
import type { RiskScoreDataClient } from '../../risk_score_data_client';
import type { RiskEngineDataWriter } from '../../risk_engine_data_writer';
import { applyScoreModifiersFromEntities } from '../../modifiers/apply_modifiers_from_entities';
import { fetchEntitiesByIds } from '../utils/fetch_entities_by_ids';
import { calculateResolutionEntityScores } from './score_resolution_entities';
import { persistScoresToEntityStore, persistScoresToRiskIndex } from './persist_scores';
import type { ResolutionStepResult } from './pipeline_types';
import type { ScopedLogger } from '../utils/with_log_context';

interface RunResolutionScoringParams {
  esClient: ElasticsearchClient;
  crudClient: EntityUpdateClient;
  logger: ScopedLogger;
  entityType: EntityType;
  alertsIndex: string;
  lookupIndex: string;
  pageSize: number;
  sampleSize: number;
  now: string;
  calculationRunId: string;
  abortSignal?: AbortSignal;
  watchlistConfigs: Map<string, WatchlistObject>;
  idBasedRiskScoringEnabled: boolean;
  writer: Awaited<ReturnType<RiskScoreDataClient['getWriter']>>;
  targetEntityIds?: string[];
  refresh?: Parameters<typeof persistScoresToRiskIndex>[0]['refresh'];
  /** When true, populate `scores` in the result. Omit for full-population runs. */
  collectScores?: boolean;
}

export const runResolutionScoringStep = async ({
  esClient,
  crudClient,
  logger: runLogger,
  entityType,
  alertsIndex,
  lookupIndex,
  pageSize,
  sampleSize,
  now,
  calculationRunId,
  abortSignal,
  watchlistConfigs,
  idBasedRiskScoringEnabled,
  writer,
  targetEntityIds,
  refresh,
  collectScores,
}: RunResolutionScoringParams): Promise<ResolutionStepResult> => {
  runLogger.debug(
    `starting phase 2 resolution scoring: page_size=${pageSize}, sample_size=${sampleSize}`
  );
  let pagesProcessed = 0;
  let scoresWrittenRiskIndex = 0;
  let scoresWrittenEntityStore = 0;
  let scoresFailed = 0;
  let scoresCalculated = 0;
  let abortedBetweenPages = false;
  const newScores: Record<string, number> = {};

  for await (const pageScores of calculateResolutionEntityScores({
    esClient,
    crudClient,
    logger: runLogger,
    entityType,
    alertsIndex,
    lookupIndex,
    pageSize,
    sampleSize,
    now,
    calculationRunId,
    watchlistConfigs,
    abortSignal,
    targetEntityIds,
  })) {
    if (abortSignal?.aborted) {
      runLogger.info('Resolution scoring aborted between pages');
      abortedBetweenPages = true;
      break;
    }
    pagesProcessed += 1;
    scoresCalculated += pageScores.length;
    if (pageScores.length > 0) {
      scoresWrittenRiskIndex += await persistScoresToRiskIndex({
        writer,
        entityType,
        scores: pageScores,
        logger: runLogger,
        refresh,
      });
      const { docsWritten, errorsCount } = await persistScoresToEntityStore({
        crudClient,
        logger: runLogger,
        entityType,
        scores: pageScores,
        enabled: idBasedRiskScoringEnabled,
      });
      scoresWrittenEntityStore += docsWritten;
      scoresFailed += errorsCount;

      if (collectScores) {
        for (const score of pageScores) {
          if ((score.related_entities?.length ?? 0) > 0) {
            newScores[score.id_value] = score.calculated_score_norm;
          }
        }
      }
    }
  }

  if (scoresWrittenRiskIndex === 0) {
    const skipReason = abortedBetweenPages
      ? 'aborted'
      : pagesProcessed === 0
      ? 'lookup_empty'
      : 'no_matching_alerts';
    runLogger.debug(
      `phase 2 resolution scoring produced no writes: reason=${skipReason}, pages=${pagesProcessed}`
    );
    return {
      scoresWrittenRiskIndex: 0,
      scoresWrittenEntityStore,
      scoresFailed,
      pagesProcessed,
      skippedReason: !abortedBetweenPages && pagesProcessed === 0 ? 'lookup_empty' : undefined,
      scores: newScores,
      scoresCalculated,
    };
  }

  runLogger.debug(
    `phase 2 resolution scoring wrote ${scoresWrittenRiskIndex} docs across ${pagesProcessed} page(s)`
  );

  return {
    scoresWrittenRiskIndex,
    scoresWrittenEntityStore,
    scoresFailed,
    pagesProcessed,
    scores: newScores,
    scoresCalculated,
  };
};

/**
 * Writes a zero resolution score for one resolution target, using the modifiers on its entity
 * store record.
 *
 * A resolution group with no alert left to score produces no row above, so the target's last
 * resolution score stays in place. A full engine run clears that up in `resetToZero`; this lets a
 * single-entity recalculation do the same right away instead of leaving the old score on screen
 * until the next run.
 */
export const persistZeroResolutionScore = async ({
  crudClient,
  logger,
  entityType,
  targetId,
  now,
  watchlistConfigs,
  calculationRunId,
  writer,
  idBasedRiskScoringEnabled,
  refresh,
}: {
  crudClient: EntityUpdateClient;
  logger: ScopedLogger;
  entityType: EntityType;
  targetId: string;
  now: string;
  watchlistConfigs: Map<string, WatchlistObject>;
  calculationRunId: string;
  writer: RiskEngineDataWriter;
  idBasedRiskScoringEnabled: boolean;
  refresh?: Parameters<typeof persistScoresToRiskIndex>[0]['refresh'];
}): Promise<number> => {
  const entities = await fetchEntitiesByIds({
    crudClient,
    entityIds: [targetId],
    logger,
    errorContext:
      'Error fetching the resolution target for the zero resolution score. Skipping the zero score write',
  });

  // Without the target we would write a score carrying no modifiers at all, which is worse than
  // leaving the previous score alone.
  if (!entities.has(targetId)) {
    logger.debug(`Skipping zero resolution score for ${targetId}: entity not found in store`);
    return 0;
  }

  const scores = applyScoreModifiersFromEntities({
    now,
    identifierType: entityType,
    scoreType: 'resolution',
    calculationRunId,
    page: {
      scores: [
        { entity_id: targetId, alert_count: 0, score: 0, normalized_score: 0, risk_inputs: [] },
      ],
      identifierField: 'entity.id',
    },
    entities,
    watchlistConfigs,
  });

  const scoresWrittenRiskIndex = await persistScoresToRiskIndex({
    writer,
    entityType,
    scores,
    logger,
    refresh,
  });
  await persistScoresToEntityStore({
    crudClient,
    logger,
    entityType,
    scores,
    enabled: idBasedRiskScoringEnabled,
  });

  return scoresWrittenRiskIndex;
};
