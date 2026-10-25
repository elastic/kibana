/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { EntityUpdateClient } from '@kbn/entity-store/server';
import type { RiskWriterProfile } from '../utils/risk_writer_profile';
import type { EntityType } from '../../../../../../common/entity_analytics/types';
import type { WatchlistObject } from '../../../../../../common/api/entity_analytics/watchlists/management/common.gen';
import type { EntityRiskScoreRecord } from '../../../../../../common/api/entity_analytics/common';
import type { RiskScoreStreamOptions } from '../../risk_engine_data_writer';
import { createRiskScoreStream } from '../utils/risk_score_stream';
import type { RiskScoreDataClient } from '../../risk_score_data_client';
import {
  buildZeroResolutionScores,
  discoverResolutionPages,
  scoreResolutionPage,
} from './score_resolution_entities';
import { persistScoresToEntityStore, persistScoresToRiskIndex } from './persist_scores';
import type { ResolutionStepResult } from './pipeline_types';
import type { PageStepRecorder, PageStepTimings } from '../utils/page_step_timings';
import { createPageStepTimings } from '../utils/page_step_timings';
import { forEachConcurrently } from '../utils/for_each_concurrently';
import { EntityIdBloomFilter } from '../utils/entity_id_bloom_filter';
import type { ScopedLogger } from '../utils/with_log_context';
import type { SampledPagesConfig } from './sampled_page_bounds';

/** Sizes a test run's filter: enough for the sampled pages' members with alerts at 20M. */
const TEST_FILL_EXPECTED_MEMBERS = 1_000_000;

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
  /** `false` skips waiting for an entity store refresh on each page; the caller refreshes once. */
  entityStoreRefresh?: Parameters<typeof persistScoresToEntityStore>[0]['refresh'];
  /** Splits each page's entity store write into this many bulk requests, sent at the same time. */
  entityStoreWriteChunks?: number;
  /** Splits each page's risk index write into this many bulk requests, sent at the same time. */
  riskIndexWriteChunks?: number;
  riskIndexStream?: RiskScoreStreamOptions;
  riskWriterProfile?: RiskWriterProfile;
  /** How many pages are scored and written at the same time. */
  pagesInFlight?: number;
  /** Find each alert's resolution target by joining the entity store rather than the lookup index. */
  joinEntityStore?: boolean;
  /** Reduce alerts to one row per entity before joining them to their resolution targets. */
  preAggregateByEntity?: boolean;
  /** Full runs: read the groups from the entity store instead of the Phase 0 lookup index. */
  membershipFromStore?: boolean;
  /** With `membershipFromStore`: place every page's range from one sample of the aliases. */
  sampledPages?: SampledPagesConfig;
  /** With `membershipFromStore`: base found every in-scope alert of this type stamped. */
  allAlertsStamped?: boolean;
  /** With `membershipFromStore`: the entities base scored, when it scored every page. */
  entitiesWithAlerts?: EntityIdBloomFilter;
  /**
   * Test runs only: base scored a sample of its pages, so fill a filter page by page from the
   * members' stored base scores instead. Needs one earlier full run on the same data.
   */
  testFillMembersFromStore?: boolean;
  /**
   * Leave out of the entity store write the resolution scores a target's store document already
   * holds. The risk index still gets every score. Store pages only: they read each target's stored
   * resolution score with its modifiers.
   */
  skipUnchangedStoreWrites?: boolean;
  /** When true, populate `scores` in the result. Omit for full-population runs. */
  collectScores?: boolean;
  /** Collects each page's step times; pass one in to read them after the stage. */
  pageTimings?: PageStepTimings;
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
  entityStoreRefresh,
  entityStoreWriteChunks,
  riskIndexWriteChunks,
  riskIndexStream,
  riskWriterProfile,
  pagesInFlight = 1,
  joinEntityStore,
  preAggregateByEntity,
  membershipFromStore,
  sampledPages,
  allAlertsStamped,
  entitiesWithAlerts,
  testFillMembersFromStore = false,
  skipUnchangedStoreWrites = false,
  collectScores,
  pageTimings = createPageStepTimings(),
}: RunResolutionScoringParams): Promise<ResolutionStepResult> => {
  runLogger.debug(
    `starting phase 2 resolution scoring: page_size=${pageSize}, sample_size=${sampleSize}`
  );
  let pagesProcessed = 0;
  let scoresWrittenRiskIndex = 0;
  let scoresWrittenEntityStore = 0;
  let scoresFailed = 0;
  let scoresUnchangedInStore = 0;
  let abortedBetweenPages = false;
  const newScores: Record<string, number> = {};
  const scoredTargetIds = new Set<string>();
  const stream = riskIndexStream
    ? createRiskScoreStream({
        writer,
        entityType,
        options: riskIndexStream,
        profile: riskWriterProfile,
        refresh,
        logger: runLogger,
        stage: 'resolution',
      })
    : undefined;

  // Pages run concurrently, so every counter is updated after its page's awaits, never across one.
  const writeScores = async (
    scores: EntityRiskScoreRecord[],
    timer?: PageStepRecorder,
    unchangedInStore?: Set<string>
  ) => {
    const storeScores =
      unchangedInStore && unchangedInStore.size > 0
        ? scores.filter((score) => !unchangedInStore.has(score.id_value))
        : scores;
    if (stream) {
      if (timer) {
        await timer.time('riskEnqueue', () => stream.write(scores));
      } else {
        await stream.write(scores);
      }
    } else {
      const docsWrittenRiskIndex = await persistScoresToRiskIndex({
        writer,
        entityType,
        scores,
        logger: runLogger,
        refresh,
        timer,
        parallelChunks: riskIndexWriteChunks,
        profile: riskWriterProfile,
      });
      scoresWrittenRiskIndex += docsWrittenRiskIndex;
    }
    const writeToStore = () =>
      persistScoresToEntityStore({
        crudClient,
        logger: runLogger,
        entityType,
        scores: storeScores,
        enabled: idBasedRiskScoringEnabled,
        refresh: entityStoreRefresh,
        parallelChunks: entityStoreWriteChunks,
      });
    const { docsWritten, errorsCount } = timer
      ? await timer.time('storeWrite', writeToStore, (result) => result.tookMs)
      : await writeToStore();
    scoresWrittenEntityStore += docsWritten;
    scoresFailed += errorsCount;
    scoresUnchangedInStore += scores.length - storeScores.length;

    if (collectScores) {
      for (const score of scores) {
        if ((score.related_entities?.length ?? 0) > 0) {
          newScores[score.id_value] = score.calculated_score_norm;
        }
      }
    }
  };

  const scoringParams = {
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
    joinEntityStore,
    preAggregateByEntity,
    membershipFromStore,
    sampledPages,
    allAlertsStamped,
    ...(membershipFromStore && (entitiesWithAlerts || testFillMembersFromStore)
      ? {
          entitiesWithAlerts:
            entitiesWithAlerts ?? EntityIdBloomFilter.forCount(TEST_FILL_EXPECTED_MEMBERS),
          testFillMembersFromStore: entitiesWithAlerts === undefined,
        }
      : {}),
  };

  try {
    await forEachConcurrently(
      discoverResolutionPages(scoringParams),
      pagesInFlight,
      async (task) => {
        const { scores: pageScores, unchangedInStore } = await scoreResolutionPage(
          scoringParams,
          task
        );
        if (abortSignal?.aborted) {
          runLogger.info('Resolution scoring aborted between pages');
          abortedBetweenPages = true;
          task.timer.end();
          return;
        }
        pagesProcessed += 1;
        if (pageScores.length > 0) {
          // Tracked before the write, so a failed write doesn't look like a group with nothing to
          // score and get its score zeroed below.
          for (const score of pageScores) {
            scoredTargetIds.add(score.id_value);
          }
          await writeScores(
            pageScores,
            task.timer,
            skipUnchangedStoreWrites ? unchangedInStore : undefined
          );
        }
        task.timer.end();
      }
    );

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
  } finally {
    if (stream) {
      const { successful, failed } = await stream.finish();
      scoresWrittenRiskIndex += successful;
      scoresFailed += failed;
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
      scoresUnchangedInStore,
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
    scoresUnchangedInStore,
    scores: newScores,
  };
};
