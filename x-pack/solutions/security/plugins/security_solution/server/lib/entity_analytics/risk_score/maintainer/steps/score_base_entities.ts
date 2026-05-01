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
import { getBaseScoreESQLByIds } from '../../calculate_esql_risk_scores';
import { parseEsqlBaseScoreRow } from './parse_esql_row';
import { applyScoreModifiersFromEntities } from '../../modifiers/apply_modifiers_from_entities';
import type { ScoredEntityPage, StepResult, RiskScoreModifierEntity } from './pipeline_types';
import { normalizeModifierEntity } from '../utils/fetch_entities_by_ids';
import type { ScopedLogger } from '../utils/with_log_context';
import { persistScoresToEntityStore, persistScoresToRiskIndex } from './persist_scores';
import { MAX_ENTITY_SEARCH_PAGE_SIZE } from '../../constants';

interface ScoreBaseEntitiesParams {
  esClient: ElasticsearchClient;
  crudClient: EntityUpdateClient;
  logger: ScopedLogger;
  entityType: EntityType;
  alertFilters: QueryDslQueryContainer[];
  alertsIndex: string;
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
  abortSignal?: AbortSignal;
}

export type Phase1BaseScoringSummary = StepResult;

/**
 * Computes base risk scores for one entity type and streams paginated results.
 *
 * Each page is scored from alert inputs, enriched with entity-derived modifiers,
 * and returned without persistence.
 */
export const calculateBaseEntityScores = async function* ({
  esClient,
  crudClient,
  logger,
  entityType,
  alertFilters,
  alertsIndex,
  pageSize,
  sampleSize,
  now,
  watchlistConfigs,
  calculationRunId,
  abortSignal,
}: ScoreBaseEntitiesParams): AsyncGenerator<ScoredEntityPage> {
  let searchAfter: Array<string | number> | undefined;
  let previousSearchAfter: Array<string | number> | undefined;

  do {
    if (abortSignal?.aborted) {
      logger.info('Base scoring aborted between pages');
      return;
    }
    const { entities, nextSearchAfter } = await crudClient.listEntities({
      filter: { terms: { 'entity.EngineMetadata.Type': [entityType] } },
      size: Math.min(pageSize, MAX_ENTITY_SEARCH_PAGE_SIZE),
      searchAfter,
      source: [
        'entity.id',
        'entity.attributes.watchlists',
        'entity.relationships.resolution.resolved_to',
        'asset.criticality',
      ],
    });
    searchAfter = nextSearchAfter;
    if (
      searchAfter !== undefined &&
      previousSearchAfter !== undefined &&
      JSON.stringify(searchAfter) === JSON.stringify(previousSearchAfter)
    ) {
      logger.error(
        'listEntities returned the same searchAfter cursor twice; aborting pagination to prevent infinite loop'
      );
      break;
    }
    previousSearchAfter = searchAfter;

    const entityIds = entities
      .map((entity) => entity.entity?.id)
      .filter((id): id is string => typeof id === 'string');

    if (entityIds.length > 0) {
      const scores = await scorePageByIds({
        esClient,
        entityType,
        entityIds,
        sampleSize,
        pageSize,
        alertsIndex,
        alertFilters,
      });

      if (scores.length > 0) {
        const entityMap = buildEntityMapFromListResult(entities);
        yield applyBaseScoreModifiers({
          scores,
          entities: entityMap,
          now,
          entityType,
          calculationRunId,
          watchlistConfigs,
        });
      }
    }
  } while (searchAfter !== undefined);
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

const scorePageByIds = async ({
  esClient,
  entityType,
  entityIds,
  sampleSize,
  pageSize,
  alertsIndex,
  alertFilters,
}: {
  esClient: ElasticsearchClient;
  entityType: EntityType;
  entityIds: string[];
  sampleSize: number;
  pageSize: number;
  alertsIndex: string;
  alertFilters: QueryDslQueryContainer[];
}) => {
  const query = getBaseScoreESQLByIds(entityType, entityIds, sampleSize, pageSize, alertsIndex);
  const esqlResponse = await esClient.esql.query({
    query,
    filter: { bool: { filter: alertFilters } },
  });

  return (esqlResponse.values ?? []).map(parseEsqlBaseScoreRow(alertsIndex));
};

const buildEntityMapFromListResult = (
  entities: Array<{
    entity?: {
      id?: string;
      attributes?: { watchlists?: unknown };
      relationships?: { resolution?: { resolved_to?: unknown } };
    };
    asset?: RiskScoreModifierEntity['asset'] | null;
  }>
): Map<string, RiskScoreModifierEntity> => {
  const entityMap = new Map<string, RiskScoreModifierEntity>();
  for (const entity of entities) {
    const normalized = normalizeModifierEntity(entity);
    if (normalized?.entity?.id) {
      entityMap.set(normalized.entity.id, normalized);
    }
  }
  return entityMap;
};

const applyBaseScoreModifiers = ({
  scores,
  entities,
  now,
  entityType,
  calculationRunId,
  watchlistConfigs,
}: {
  scores: ReturnType<ReturnType<typeof parseEsqlBaseScoreRow>>[];
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
