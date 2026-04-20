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
import {
  getEuidCompositeQuery,
  getBaseScoreESQL,
  type EuidCompositeAggregation,
} from '../../calculate_esql_risk_scores';
import { parseEsqlBaseScoreRow } from './parse_esql_row';
import { applyScoreModifiersFromEntities } from '../../modifiers/apply_modifiers_from_entities';
import type { ScoredEntityPage, StepResult } from './pipeline_types';
import { categorizePhase1Entities } from './categorize_phase1_entities';
import { fetchEntitiesByIds } from '../utils/fetch_entities_by_ids';
import type { ScopedLogger } from '../utils/with_log_context';
import { syncLookupIndexForCategorizedPage } from '../lookup/sync_lookup_index';
import { persistScoresToEntityStore, persistScoresToRiskIndex } from './persist_scores';

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
}

interface ScoreAndPersistBaseEntitiesParams extends ScoreBaseEntitiesParams {
  writer: RiskEngineDataWriter;
  idBasedRiskScoringEnabled: boolean;
  lookupIndex: string;
}

export interface Phase1BaseScoringSummary extends StepResult {
  writeNowCount: number;
  deferToPhase2Count: number;
  notInStoreCount: number;
  lookupDocsUpserted: number;
  lookupDocsDeleted: number;
}

interface EuidPageBounds {
  lower: string | undefined;
  upper: string;
}

interface EuidPageResult {
  upperBound: string;
  afterKey: Record<string, string> | undefined;
}

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
}: ScoreBaseEntitiesParams): AsyncGenerator<ScoredEntityPage> {
  let afterKey: Record<string, string> | undefined;
  let previousPageUpperBound: string | undefined;

  do {
    // Per page: find this page's start/end IDs for scoring, then apply entity modifiers.
    const pageResult = await fetchNextEuidPage({
      esClient,
      entityType,
      alertFilters,
      alertsIndex,
      pageSize,
      afterKey,
    });
    if (!pageResult) break;

    afterKey = pageResult.afterKey;
    const scores = await scorePageFromAlerts({
      esClient,
      entityType,
      bounds: { lower: previousPageUpperBound, upper: pageResult.upperBound },
      sampleSize,
      pageSize,
      alertsIndex,
      alertFilters,
    });
    previousPageUpperBound = pageResult.upperBound;

    if (scores.length > 0) {
      yield await enrichWithModifiers({
        crudClient,
        logger,
        scores,
        now,
        entityType,
        calculationRunId,
        watchlistConfigs,
      });
    }
  } while (afterKey !== undefined);
};

export const scoreBaseEntities = async ({
  writer,
  idBasedRiskScoringEnabled,
  lookupIndex,
  ...params
}: ScoreAndPersistBaseEntitiesParams): Promise<Phase1BaseScoringSummary> => {
  // Persist using categorized write groups to keep routing explicit.
  let writeNowCount = 0;
  let deferToPhase2Count = 0;
  let notInStoreCount = 0;
  let pagesProcessed = 0;
  let scoresWritten = 0;
  let lookupDocsUpserted = 0;
  let lookupDocsDeleted = 0;

  for await (const page of calculateBaseEntityScores(params)) {
    // Per page: split docs by write path, sync lookup docs, then write scores.
    pagesProcessed += 1;
    const categorized = categorizePhase1Entities(page);
    const lookupSyncResult = await syncLookupIndexForCategorizedPage({
      esClient: params.esClient,
      index: lookupIndex,
      page,
      categorized,
      now: params.now,
    });

    writeNowCount += categorized.write_now.length;
    deferToPhase2Count += categorized.defer_to_phase_2.length;
    notInStoreCount += categorized.not_in_store.length;
    lookupDocsUpserted += lookupSyncResult.upserted;
    lookupDocsDeleted += lookupSyncResult.deleted;

    params.logger.debug(
      `[page:${pagesProcessed}] categorization: write_now=${categorized.write_now.length}, defer_to_phase_2=${categorized.defer_to_phase_2.length}, not_in_store=${categorized.not_in_store.length}`
    );
    params.logger.debug(
      `[page:${pagesProcessed}] lookup sync: upserts=${lookupSyncResult.upserted}, deletes=${lookupSyncResult.deleted}`
    );

    // Keep dual-write semantics from phase 1 categorization:
    // `defer_to_phase_2` remains persisted to the risk index for continuity.
    const riskIndexWrites = [...categorized.write_now, ...categorized.defer_to_phase_2];
    scoresWritten += await persistScoresToRiskIndex({
      writer,
      entityType: params.entityType,
      scores: riskIndexWrites,
      logger: params.logger,
    });
    await persistScoresToEntityStore({
      crudClient: params.crudClient,
      logger: params.logger,
      entityType: params.entityType,
      scores: riskIndexWrites,
      enabled: idBasedRiskScoringEnabled,
    });

    if (categorized.not_in_store.length > 0) {
      params.logger.debug(
        `[page:${pagesProcessed}] skipped writes for ${categorized.not_in_store.length} not_in_store entities`
      );
    }
  }

  params.logger.debug(
    `categorization totals: pages=${pagesProcessed}, write_now=${writeNowCount}, defer_to_phase_2=${deferToPhase2Count}, not_in_store=${notInStoreCount}`
  );
  params.logger.debug(
    `lookup sync totals: upserts=${lookupDocsUpserted}, deletes=${lookupDocsDeleted}`
  );

  return {
    pagesProcessed,
    writeNowCount,
    deferToPhase2Count,
    notInStoreCount,
    scoresWritten,
    lookupDocsUpserted,
    lookupDocsDeleted,
  };
};

const fetchNextEuidPage = async ({
  esClient,
  entityType,
  alertFilters,
  alertsIndex,
  pageSize,
  afterKey,
}: {
  esClient: ElasticsearchClient;
  entityType: EntityType;
  alertFilters: QueryDslQueryContainer[];
  alertsIndex: string;
  pageSize: number;
  afterKey: Record<string, string> | undefined;
}): Promise<EuidPageResult | null> => {
  // Composite paging gives stable ID boundaries for each score query.
  const compositeResponse = await esClient.search(
    getEuidCompositeQuery(entityType, alertFilters, {
      index: alertsIndex,
      pageSize,
      afterKey,
    })
  );

  const compositeAgg = (
    compositeResponse.aggregations as { by_entity_id?: EuidCompositeAggregation } | undefined
  )?.by_entity_id;
  const buckets = compositeAgg?.buckets ?? [];
  if (buckets.length === 0) {
    return null;
  }

  return {
    upperBound: buckets[buckets.length - 1].key.entity_id,
    afterKey: compositeAgg?.after_key,
  };
};

const scorePageFromAlerts = async ({
  esClient,
  entityType,
  bounds,
  sampleSize,
  pageSize,
  alertsIndex,
  alertFilters,
}: {
  esClient: ElasticsearchClient;
  entityType: EntityType;
  bounds: EuidPageBounds;
  sampleSize: number;
  pageSize: number;
  alertsIndex: string;
  alertFilters: QueryDslQueryContainer[];
}) => {
  const query = getBaseScoreESQL(entityType, bounds, sampleSize, pageSize, alertsIndex);
  const esqlResponse = await esClient.esql.query({
    query,
    filter: { bool: { filter: alertFilters } },
  });

  return (esqlResponse.values ?? []).map(parseEsqlBaseScoreRow(alertsIndex));
};

const enrichWithModifiers = async ({
  crudClient,
  logger,
  scores,
  now,
  entityType,
  calculationRunId,
  watchlistConfigs,
}: {
  crudClient: EntityUpdateClient;
  logger: ScopedLogger;
  scores: ReturnType<ReturnType<typeof parseEsqlBaseScoreRow>>[];
  now: string;
  entityType: EntityType;
  calculationRunId: string;
  watchlistConfigs: Map<string, WatchlistObject>;
}): Promise<ScoredEntityPage> => {
  const euidValues = scores.map((score) => score.entity_id);
  const entityMap = await fetchEntitiesByIds({
    crudClient,
    entityIds: euidValues,
    logger,
    errorContext:
      'Error fetching entities for modifier application. Scoring will proceed without modifiers',
  });

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
    entities: entityMap,
    watchlistConfigs,
  });

  return { entityIds: euidValues, scores: finalScores, entities: entityMap };
};
