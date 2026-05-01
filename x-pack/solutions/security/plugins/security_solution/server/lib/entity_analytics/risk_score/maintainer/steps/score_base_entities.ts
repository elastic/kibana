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
import { MAX_ENTITY_SEARCH_PAGE_SIZE } from '../../constants';
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
 *   to score. Phase 0 deduplicates rows by `entity_id`, so a single
 *   `search_after` walk over the lookup index visits each entity exactly once.
 * - Each page reads up to `pageSize` `entity_id`s from the lookup index
 *   (filtered to the current entity type via the EUID type prefix), then
 *   passes them to one ES|QL query as a `WHERE entity_id IN (...)` clause.
 *   Lucene pushes the predicate down so non-matching alerts are dropped at
 *   scan time, keeping memory bounded — empirically ~3× lower than the
 *   LOOKUP JOIN shape on alert-heavy workloads.
 * - Modifier entities are fetched after scoring, only for IDs that produced
 *   scores, to avoid round-trips for entities with zero alerts.
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
  const lookupPageSize = Math.min(pageSize, MAX_ENTITY_SEARCH_PAGE_SIZE);
  let cursor: string | undefined;

  while (true) {
    if (abortSignal?.aborted) {
      logger.info('Base scoring aborted between pages');
      return;
    }

    const { entityIds, nextCursor } = await fetchNextLookupPage({
      esClient,
      lookupIndex,
      entityType,
      pageSize: lookupPageSize,
      cursor,
    });

    if (entityIds.length === 0) {
      return;
    }

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
    }

    if (nextCursor === undefined) {
      return;
    }
    cursor = nextCursor;
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

const fetchNextLookupPage = async ({
  esClient,
  lookupIndex,
  entityType,
  pageSize,
  cursor,
}: {
  esClient: ElasticsearchClient;
  lookupIndex: string;
  entityType: EntityType;
  pageSize: number;
  cursor: string | undefined;
}): Promise<{ entityIds: string[]; nextCursor: string | undefined }> => {
  const response = await esClient.search<{ entity_id?: string }>({
    index: lookupIndex,
    size: pageSize,
    _source: ['entity_id'],
    track_total_hits: false,
    sort: [{ entity_id: { order: 'asc' } }],
    // Strict undefined check: the lookup index never stores empty-string EUIDs
    // today, but a truthy check would treat one as "no cursor" and re-page
    // from the start — guard against that drift.
    search_after: cursor !== undefined ? [cursor] : undefined,
    query: {
      // EUIDs are always prefixed with `${entityType}:` (see
      // appendTypeIdIfNeeded in entity_store/common/domain/euid/esql.ts), so
      // a prefix filter is sufficient to scope the page to one entity type.
      prefix: { entity_id: `${entityType}:` },
    },
  });

  const hits = response.hits.hits ?? [];
  const entityIds: string[] = [];
  for (const hit of hits) {
    const entityId = hit._source?.entity_id;
    if (typeof entityId === 'string') {
      entityIds.push(entityId);
    }
  }

  // Termination: short page (fewer hits than requested) means the slice for
  // this entity type is exhausted.
  const nextCursor = hits.length < pageSize ? undefined : entityIds[entityIds.length - 1];
  return { entityIds, nextCursor };
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
}): Promise<ParsedRiskScore[]> => {
  const query = getBaseScoreESQLByIds(entityType, entityIds, sampleSize, pageSize, alertsIndex);
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
