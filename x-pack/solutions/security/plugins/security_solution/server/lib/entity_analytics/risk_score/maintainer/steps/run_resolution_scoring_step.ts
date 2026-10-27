/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { EntityUpdateClient } from '@kbn/entity-store/server';
import type { EntityType } from '../../../../../../common/entity_analytics/types';
import type { WatchlistObject } from '../../../../../../common/api/entity_analytics/watchlists/management/common.gen';
import type { EntityRiskScoreRecord } from '../../../../../../common/api/entity_analytics/common';
import type { RiskScoreDataClient } from '../../risk_score_data_client';
import {
  buildZeroResolutionScores,
  calculateResolutionEntityScores,
} from './score_resolution_entities';
import { persistScoresToEntityStore, persistScoresToRiskIndex } from './persist_scores';
import type { ResolutionStepResult } from './pipeline_types';
import type { PageStepTimings } from '../instrumentation/page_timing_types';
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
  alertFilters: QueryDslQueryContainer[];
  refresh?: Parameters<typeof persistScoresToRiskIndex>[0]['refresh'];
  /** When true, populate `scores` in the result. Omit for full-population runs. */
  collectScores?: boolean;
  /** Stage-owned collector shared across scoring and persistence, including failed pages. */
  pageTimings: PageStepTimings;
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
  alertFilters,
  refresh,
  collectScores,
  pageTimings,
}: RunResolutionScoringParams): Promise<ResolutionStepResult> => {
  runLogger.debug(
    `starting phase 2 resolution scoring: page_size=${pageSize}, sample_size=${sampleSize}`
  );
  let pagesProcessed = 0;
  let scoresWrittenRiskIndex = 0;
  let scoresWrittenEntityStore = 0;
  let scoresFailed = 0;
  let abortedBetweenPages = false;
  const newScores: Record<string, number> = {};
  const scoredTargetIds = new Set<string>();

  const writeScores = async (scores: EntityRiskScoreRecord[]) => {
    const docsWrittenRiskIndex = await persistScoresToRiskIndex({
      writer,
      entityType,
      scores,
      logger: runLogger,
      refresh,
      pageTimings,
    });
    const { docsWritten, errorsCount } = await pageTimings.time(['store', 'write'], () =>
      persistScoresToEntityStore({
        crudClient,
        logger: runLogger,
        entityType,
        scores,
        enabled: idBasedRiskScoringEnabled,
      })
    );
    scoresWrittenRiskIndex += docsWrittenRiskIndex;
    pageTimings.count('storeDocumentsWritten', docsWritten);
    pageTimings.count('storeWriteFailures', errorsCount);
    scoresWrittenEntityStore += docsWritten;
    scoresFailed += errorsCount;

    if (collectScores) {
      for (const score of scores) {
        if ((score.related_entities?.length ?? 0) > 0) {
          newScores[score.id_value] = score.calculated_score_norm;
        }
      }
    }
  };

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
    alertFilters,
    pageTimings,
  })) {
    if (abortSignal?.aborted) {
      runLogger.info('Resolution scoring aborted between pages');
      abortedBetweenPages = true;
      break;
    }
    pagesProcessed += 1;
    if (pageScores.length > 0) {
      // Tracked before the write, so a failed write doesn't look like a group with nothing to score
      // and get its score zeroed below.
      for (const score of pageScores) {
        scoredTargetIds.add(score.id_value);
      }
      await writeScores(pageScores);
    }
  }

  // A targeted run clears the stale score of a target whose group has no alert left, instead of
  // leaving it on screen until the next full run's `resetToZero`. A processed page means the lookup
  // holds the targets' groups, which is exact for the single target recalculation passes.
  if (targetEntityIds && pagesProcessed > 0 && !abortedBetweenPages) {
    const unscoredTargetIds = targetEntityIds.filter((id) => !scoredTargetIds.has(id));
    if (unscoredTargetIds.length > 0) {
      let zeroScores: EntityRiskScoreRecord[] = [];
      try {
        zeroScores = await buildZeroResolutionScores({
          esClient,
          crudClient,
          logger: runLogger,
          entityType,
          lookupIndex,
          now,
          calculationRunId,
          watchlistConfigs,
          resolutionTargetIds: unscoredTargetIds,
        });
      } catch (error) {
        runLogger.warn(
          `Error building zero resolution scores, keeping the previous scores in place: ${error}`
        );
      }
      if (zeroScores.length > 0) {
        await writeScores(zeroScores);
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
  };
};
