/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Kept separate from legacy reset-to-zero to avoid mixed dependency paths.

import type { ElasticsearchClient } from '@kbn/core/server';
import type { EntityUpdateClient } from '@kbn/entity-store/server';
import {
  EntityIdentifierFields,
  type EntityType,
} from '../../../../../../common/entity_analytics/types';
import type { WatchlistObject } from '../../../../../../common/api/entity_analytics/watchlists/management/common.gen';
import type { RiskEngineDataWriter } from '../../risk_engine_data_writer';
import { applyScoreModifiersFromEntities } from '../../modifiers/apply_modifiers_from_entities';
import { getIndexPatternDataStream } from '../../configurations';
import { fetchEntitiesByIds } from '../utils/fetch_entities_by_ids';
import type { ScopedLogger } from '../utils/with_log_context';
import type { ParsedRiskScore } from './parse_esql_row';
import type { EntityRiskScoreRecord } from '../../../../../../common/api/entity_analytics/common';
import { persistScoresToEntityStore, persistScoresToRiskIndex } from './persist_scores';
import type { StepResult } from './pipeline_types';

export interface ResetToZeroDependencies {
  esClient: ElasticsearchClient;
  writer: RiskEngineDataWriter;
  spaceId: string;
  entityType: EntityType;
  logger: ScopedLogger;
  crudClient: EntityUpdateClient;
  watchlistConfigs: Map<string, WatchlistObject>;
  idBasedRiskScoringEnabled: boolean;
  calculationRunId: string;
  now: string;
}

const RISK_SCORE_FIELD = 'risk.calculated_score_norm';
const RISK_SCORE_ID_VALUE_FIELD = 'risk.id_value';
const RISK_SCORE_TYPE_FIELD = 'risk.score_type';
const RISK_SCORE_RUN_ID_FIELD = 'risk.calculation_run_id';
const RESET_BATCH_LIMIT = 10000;
type ResetScoreType = Extract<
  NonNullable<EntityRiskScoreRecord['score_type']>,
  'base' | 'resolution'
>;

export interface ResetToZeroSummary extends StepResult {
  resetBatchLimitHit: boolean;
}

export const resetToZero = async ({
  esClient,
  writer,
  spaceId,
  entityType,
  logger,
  crudClient,
  watchlistConfigs,
  idBasedRiskScoringEnabled,
  calculationRunId,
  now,
}: ResetToZeroDependencies): Promise<ResetToZeroSummary> => {
  const { alias } = await getIndexPatternDataStream(spaceId);
  const indexExists = await esClient.indices.exists({ index: alias });
  if (!indexExists) {
    logger.debug(`reset_to_zero skipped because index "${alias}" does not exist yet`);
    return { scoresWritten: 0, pagesProcessed: 0, resetBatchLimitHit: false };
  }

  const entityField = `${entityType}.${RISK_SCORE_ID_VALUE_FIELD}`;
  const scoreField = `${entityType}.${RISK_SCORE_FIELD}`;
  const scoreTypeField = `${entityType}.${RISK_SCORE_TYPE_FIELD}`;
  const runIdField = `${entityType}.${RISK_SCORE_RUN_ID_FIELD}`;
  const identifierField = EntityIdentifierFields.generic;
  const getStaleEntityIds = async (scoreType: ResetScoreType): Promise<string[]> => {
    const scoreTypeFilter =
      scoreType === 'base'
        ? 'score_type IS NULL OR score_type == "base"'
        : 'score_type == "resolution"';
    const esql = /* sql */ `
    FROM ${alias}
    | EVAL id_value = TO_STRING(${entityField})
    | EVAL score = TO_DOUBLE(${scoreField})
    | EVAL score_type = TO_STRING(${scoreTypeField})
    | EVAL calculation_run_id = TO_STRING(${runIdField})
    | WHERE id_value IS NOT NULL AND id_value != ""
    | WHERE ${scoreTypeFilter}
    | STATS
        score = LAST(score, @timestamp),
        calculation_run_id = LAST(calculation_run_id, @timestamp)
      BY id_value
    | WHERE score > 0
    | WHERE calculation_run_id IS NULL OR calculation_run_id != "${calculationRunId}"
    | KEEP id_value
    // Bounded per run; remaining stale entities are handled by later runs.
    | LIMIT ${RESET_BATCH_LIMIT}
    `;

    logger.debug(`reset_to_zero (${scoreType}) ESQL query:\n${esql}`);

    const response = await esClient.esql.query({ query: esql }).catch((e) => {
      logger.error(
        `Error executing ESQL query to reset ${entityType} ${scoreType} risk scores to zero: ${e.message}`
      );
      throw e;
    });

    return response.values.reduce<string[]>((acc, row) => {
      const [entity] = row;
      if (typeof entity !== 'string' || entity === '') {
        return acc;
      }
      acc.push(entity);
      return acc;
    }, []);
  };

  const baseEntityIds = await getStaleEntityIds('base');
  const resolutionEntityIds = await getStaleEntityIds('resolution');
  const allEntityIds = [...new Set([...baseEntityIds, ...resolutionEntityIds])];

  if (allEntityIds.length === 0) {
    logger.debug('reset_to_zero found no stale entities');
    return { scoresWritten: 0, pagesProcessed: 0, resetBatchLimitHit: false };
  }

  const resetBatchLimitHit =
    baseEntityIds.length === RESET_BATCH_LIMIT || resolutionEntityIds.length === RESET_BATCH_LIMIT;

  const buildZeroScores = (entityIds: string[]): ParsedRiskScore[] =>
    entityIds.map((entityId) => ({
      entity_id: entityId,
      alert_count: 0,
      score: 0,
      normalized_score: 0,
      risk_inputs: [],
    }));

  const entities = await fetchEntitiesByIds({
    crudClient,
    entityIds: allEntityIds,
    logger,
    errorContext:
      'Error fetching entities for reset-to-zero modifier application. Reset will proceed without modifiers',
  });

  const baseScores = applyScoreModifiersFromEntities({
    now,
    identifierType: entityType,
    scoreType: 'base',
    calculationRunId,
    page: {
      scores: buildZeroScores(baseEntityIds),
      identifierField,
    },
    entities,
    watchlistConfigs,
  });

  const resolutionScores = applyScoreModifiersFromEntities({
    now,
    identifierType: entityType,
    scoreType: 'resolution',
    calculationRunId,
    page: {
      scores: buildZeroScores(resolutionEntityIds),
      identifierField,
    },
    entities,
    watchlistConfigs,
  });

  const scores = [...baseScores, ...resolutionScores];
  const scoresWritten = await persistScoresToRiskIndex({
    writer,
    entityType,
    scores,
    logger,
  });

  await persistScoresToEntityStore({
    crudClient,
    logger,
    entityType,
    scores,
    enabled: idBasedRiskScoringEnabled,
  });

  return { scoresWritten, pagesProcessed: 0, resetBatchLimitHit };
};
