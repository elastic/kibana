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
import type { RiskEngineDataWriter } from '../../risk_engine_data_writer';
import { getBaseScoreESQLViaLookupJoin } from '../../calculate_esql_risk_scores';
import type { ParsedRiskScore } from './parse_esql_row';
import { parseEsqlBaseScoreRow } from './parse_esql_row';
import { applyScoreModifiersFromEntities } from '../../modifiers/apply_modifiers_from_entities';
import type { RiskScoreModifierEntity, ScoredEntityPage, StepResult } from './pipeline_types';
import { fetchEntitiesByIds } from '../utils/fetch_entities_by_ids';
import type { ScopedLogger } from '../utils/with_log_context';
import { persistScoresToEntityStore, persistScoresToRiskIndex } from './persist_scores';

interface ScoreBaseEntitiesParams {
  esClient: ElasticsearchClient;
  crudClient: EntityUpdateClient;
  logger: ScopedLogger;
  entityType: EntityType;
  alertFilters: QueryDslQueryContainer[];
  alertsIndex: string;
  lookupIndex: string;
  pageSize: number;
  sampleSize: number;
  now: string;
  watchlistConfigs: Map<string, WatchlistObject>;
  calculationRunId: string;
  abortSignal?: AbortSignal;
}

interface ScoreAndPersistBaseEntitiesParams extends ScoreBaseEntitiesParams {
  writer: RiskEngineDataWriter;
  idBasedRiskScoringEnabled: boolean;
}

export type Phase1BaseScoringSummary = StepResult;

/**
 * Computes base risk scores for one entity type and streams paginated results.
 *
 * Strategy:
 * - The lookup index (built by Phase 0) is the authoritative set of entities
 *   to score. Each row has `entity_id` keyed and `relationship_type` non-null
 *   for every in-store entity.
 * - One ES|QL query per page LOOKUP-JOINs alerts against the lookup index,
 *   drops the cross-product (alerts whose `entity_id` isn't in the lookup),
 *   and STATS BY `entity_id`.
 * - Pagination uses an `entity_id` cursor on the ES|QL output: each page reads
 *   up to `pageSize` rows sorted by `entity_id` ASC (capped at 10,000 by ES|QL),
 *   and the last row's `entity_id` becomes the next page's exclusive lower
 *   bound. Termination: row count < pageSize.
 * - Modifier entities are fetched after scoring, only for IDs that produced
 *   scores — fewer round trips than fetching every store entity upfront.
 */
export const calculateBaseEntityScores = async function* ({
  esClient,
  crudClient,
  logger,
  entityType,
  alertFilters,
  alertsIndex,
  lookupIndex,
  pageSize,
  sampleSize,
  now,
  watchlistConfigs,
  calculationRunId,
  abortSignal,
}: ScoreBaseEntitiesParams): AsyncGenerator<ScoredEntityPage> {
  let cursor: string | undefined;

  while (true) {
    if (abortSignal?.aborted) {
      logger.info('Base scoring aborted between pages');
      return;
    }

    const scores = await scorePage({
      esClient,
      entityType,
      bounds: cursor !== undefined ? { lower: cursor } : {},
      sampleSize,
      pageSize,
      alertsIndex,
      lookupIndex,
      alertFilters,
    });

    if (scores.length === 0) {
      return;
    }

    const entities = await fetchEntitiesByIds({
      crudClient,
      entityIds: scores.map((score) => score.entity_id),
      logger,
      errorContext:
        'Error fetching entities for base modifier application. Base scoring will proceed without modifiers',
    });

    yield applyBaseScoreModifiers({
      scores,
      entities,
      now,
      entityType,
      calculationRunId,
      watchlistConfigs,
    });

    // ES|QL caps any single response at 10,000 rows regardless of LIMIT, so
    // fewer than `pageSize` returned means we've consumed the tail.
    if (scores.length < pageSize) {
      return;
    }
    cursor = scores[scores.length - 1].entity_id;
  }
};

export const scoreBaseEntities = async ({
  writer,
  idBasedRiskScoringEnabled,
  ...params
}: ScoreAndPersistBaseEntitiesParams): Promise<Phase1BaseScoringSummary> => {
  let pagesProcessed = 0;
  let scoresWritten = 0;

  for await (const page of calculateBaseEntityScores(params)) {
    pagesProcessed += 1;
    scoresWritten += await persistScoresToRiskIndex({
      writer,
      entityType: params.entityType,
      scores: page.scores,
      logger: params.logger,
    });
    await persistScoresToEntityStore({
      crudClient: params.crudClient,
      logger: params.logger,
      entityType: params.entityType,
      scores: page.scores,
      enabled: idBasedRiskScoringEnabled,
    });
  }

  return {
    pagesProcessed,
    scoresWritten,
  };
};

const scorePage = async ({
  esClient,
  entityType,
  bounds,
  sampleSize,
  pageSize,
  alertsIndex,
  lookupIndex,
  alertFilters,
}: {
  esClient: ElasticsearchClient;
  entityType: EntityType;
  bounds: { lower?: string };
  sampleSize: number;
  pageSize: number;
  alertsIndex: string;
  lookupIndex: string;
  alertFilters: QueryDslQueryContainer[];
}): Promise<ParsedRiskScore[]> => {
  const query = getBaseScoreESQLViaLookupJoin(
    entityType,
    bounds,
    sampleSize,
    pageSize,
    alertsIndex,
    lookupIndex
  );
  const esqlResponse = await esClient.esql.query({
    query,
    filter: { bool: { filter: alertFilters } },
  });

  return (esqlResponse.values ?? []).map(parseEsqlBaseScoreRow(alertsIndex));
};

const applyBaseScoreModifiers = ({
  scores,
  entities,
  now,
  entityType,
  calculationRunId,
  watchlistConfigs,
}: {
  scores: ParsedRiskScore[];
  entities: Map<string, RiskScoreModifierEntity>;
  now: string;
  entityType: EntityType;
  calculationRunId: string;
  watchlistConfigs: Map<string, WatchlistObject>;
}): ScoredEntityPage => {
  const finalScores = applyScoreModifiersFromEntities({
    now,
    identifierType: entityType,
    scoreType: 'base',
    calculationRunId,
    weights: [],
    page: {
      scores,
      identifierField: 'entity.id',
    },
    entities,
    watchlistConfigs,
  });

  return { entityIds: scores.map((score) => score.entity_id), scores: finalScores, entities };
};
