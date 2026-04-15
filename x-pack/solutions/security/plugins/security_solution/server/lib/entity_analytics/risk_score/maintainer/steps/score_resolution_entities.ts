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
import type { EntityRiskScoreRecord } from '../../../../../../common/api/entity_analytics/common';
import {
  getResolutionCompositeQuery,
  getResolutionScoreESQL,
} from '../../calculate_esql_risk_scores';
import { applyScoreModifiersFromEntities } from '../../modifiers/apply_modifiers_from_entities';
import { fetchEntitiesByIds } from '../utils/fetch_entities_by_ids';
import { buildResolutionModifierEntity } from './resolution_modifiers';
import { parseEsqlResolutionScoreRow } from './parse_esql_row';
import type { ParsedResolutionScore } from './parse_esql_row';
import type { ScopedLogger } from '../utils/with_log_context';
import type { RiskScoreModifierEntity } from './pipeline_types';

interface ScoreResolutionEntitiesParams {
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
  watchlistConfigs: Map<string, WatchlistObject>;
}

interface ResolutionPageResult {
  upperBound: string;
  bucketCount: number;
  afterKey: Record<string, string> | undefined;
}

export const calculateResolutionEntityScores = async function* ({
  esClient,
  crudClient,
  logger,
  entityType,
  alertsIndex,
  lookupIndex,
  pageSize,
  sampleSize,
  now,
  calculationRunId,
  watchlistConfigs,
}: ScoreResolutionEntitiesParams): AsyncGenerator<EntityRiskScoreRecord[], number> {
  let afterKey: Record<string, string> | undefined;
  let previousUpperBound: string | undefined;
  let pagesProcessed = 0;

  do {
    // Per page: fetch groups, score them, then apply merged group modifiers.
    const pageResult = await fetchNextResolutionPage({
      esClient,
      lookupIndex,
      pageSize,
      afterKey,
    });
    if (!pageResult) {
      break;
    }

    pagesProcessed += 1;
    afterKey = pageResult.afterKey;
    logger.debug(
      `[resolution][page:${pagesProcessed}] lookup buckets=${pageResult.bucketCount}, upper_bound="${pageResult.upperBound}"`
    );

    const { parsedScores, esqlRows } = await scoreResolutionPage({
      esClient,
      entityType,
      bounds: { lower: previousUpperBound, upper: pageResult.upperBound },
      sampleSize,
      pageSize,
      alertsIndex,
      lookupIndex,
    });
    previousUpperBound = pageResult.upperBound;
    logger.debug(
      `[resolution][page:${pagesProcessed}] parsed_scores=${parsedScores.length}, esql_rows=${esqlRows}`
    );

    let modifiedScores: EntityRiskScoreRecord[] = [];
    if (parsedScores.length > 0) {
      const allMemberIds = collectMemberEntityIds(parsedScores);
      const memberEntities = await fetchEntitiesByIds({
        crudClient,
        entityIds: [...allMemberIds],
        logger,
        errorContext:
          'Error fetching entities for resolution modifier application. Resolution scoring will proceed without modifiers',
      });
      logger.debug(
        `[resolution][page:${pagesProcessed}] member_entities_requested=${allMemberIds.size}, fetched=${memberEntities.size}`
      );

      modifiedScores = applyResolutionModifiers({
        parsedScores,
        memberEntities,
        now,
        entityType,
        calculationRunId,
        watchlistConfigs,
      });
    }
    yield modifiedScores;
    logger.debug(`[resolution][page:${pagesProcessed}] modified_scores=${modifiedScores.length}`);
  } while (afterKey !== undefined);

  return pagesProcessed;
};

const fetchNextResolutionPage = async ({
  esClient,
  lookupIndex,
  pageSize,
  afterKey,
}: {
  esClient: ElasticsearchClient;
  lookupIndex: string;
  pageSize: number;
  afterKey: Record<string, string> | undefined;
}): Promise<ResolutionPageResult | null> => {
  interface CompositeAgg {
    buckets: Array<{ key: Record<string, string> }>;
    after_key?: Record<string, string>;
  }

  const compositeResponse = await esClient.search(
    getResolutionCompositeQuery(lookupIndex, pageSize, afterKey)
  );
  const compositeAgg = (
    compositeResponse.aggregations as { by_resolution_target?: CompositeAgg } | undefined
  )?.by_resolution_target;
  const buckets = compositeAgg?.buckets ?? [];
  if (buckets.length === 0) {
    return null;
  }

  return {
    upperBound: buckets[buckets.length - 1].key.resolution_target_id,
    bucketCount: buckets.length,
    afterKey: compositeAgg?.after_key,
  };
};

const scoreResolutionPage = async ({
  esClient,
  entityType,
  bounds,
  sampleSize,
  pageSize,
  alertsIndex,
  lookupIndex,
}: {
  esClient: ElasticsearchClient;
  entityType: EntityType;
  bounds: { lower: string | undefined; upper: string };
  sampleSize: number;
  pageSize: number;
  alertsIndex: string;
  lookupIndex: string;
}): Promise<{ parsedScores: ParsedResolutionScore[]; esqlRows: number }> => {
  const query = getResolutionScoreESQL(
    entityType,
    bounds,
    sampleSize,
    pageSize,
    alertsIndex,
    lookupIndex
  );
  const esqlResponse = await esClient.esql.query({ query });
  return {
    parsedScores: (esqlResponse.values ?? []).map(parseEsqlResolutionScoreRow(alertsIndex)),
    esqlRows: esqlResponse.values?.length ?? 0,
  };
};

const collectMemberEntityIds = (parsedScores: ParsedResolutionScore[]): Set<string> => {
  const allMemberIds = new Set<string>();
  for (const score of parsedScores) {
    allMemberIds.add(score.resolution_target_id);
    for (const relatedEntity of score.related_entities) {
      allMemberIds.add(relatedEntity.entity_id);
    }
  }
  return allMemberIds;
};

const applyResolutionModifiers = ({
  parsedScores,
  memberEntities,
  now,
  entityType,
  calculationRunId,
  watchlistConfigs,
}: {
  parsedScores: ParsedResolutionScore[];
  memberEntities: Map<string, RiskScoreModifierEntity>;
  now: string;
  entityType: EntityType;
  calculationRunId: string;
  watchlistConfigs: Map<string, WatchlistObject>;
}): EntityRiskScoreRecord[] => {
  const mergedModifierEntities = new Map(
    parsedScores.map((score) => [
      score.resolution_target_id,
      buildResolutionModifierEntity({ score, memberEntities }),
    ])
  );
  const scoresForModifierPipeline = parsedScores.map((score) => ({
    entity_id: score.resolution_target_id,
    alert_count: score.alert_count,
    score: score.score,
    normalized_score: score.normalized_score,
    risk_inputs: score.risk_inputs,
  }));
  const modifiedScores = applyScoreModifiersFromEntities({
    now,
    identifierType: entityType,
    scoreType: 'resolution',
    calculationRunId,
    weights: [],
    page: {
      scores: scoresForModifierPipeline,
      identifierField: 'entity.id',
    },
    entities: mergedModifierEntities,
    watchlistConfigs,
  });

  return modifiedScores.map((modifiedScore, index) => ({
    ...modifiedScore,
    related_entities: parsedScores[index].related_entities,
  }));
};
