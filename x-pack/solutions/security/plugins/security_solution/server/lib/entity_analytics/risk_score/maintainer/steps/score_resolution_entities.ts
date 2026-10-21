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
import {
  getResolutionCompositeQuery,
  getResolutionScoreESQLByIds,
  getResolutionScoreESQLByRange,
} from '../../calculate_esql_risk_scores';
import { MAX_RESOLUTION_TARGETS_PER_PAGE, RISK_SCORING_REQUEST_TIMEOUT } from '../../constants';
import { RESOLUTION_RELATIONSHIP_TYPE } from '../lookup/lookup_types';
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
  abortSignal?: AbortSignal;
  targetEntityIds?: string[];
  /** Same time range, status and custom filters base scoring applies to alerts. */
  alertFilters: QueryDslQueryContainer[];
}

interface ResolutionPageResult {
  resolutionTargetIds: string[];
  bucketCount: number;
  afterKey: Record<string, string> | undefined;
}

const RESOLUTION_GROUP_MEMBER_FETCH_PAGE_SIZE = 1000;

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
  abortSignal,
  targetEntityIds,
  alertFilters,
}: ScoreResolutionEntitiesParams): AsyncGenerator<EntityRiskScoreRecord[], number> {
  let afterKey: Record<string, string> | undefined;
  let previousPageUpperBound: string | undefined;
  let pagesProcessed = 0;

  do {
    if (abortSignal?.aborted) {
      logger.info('Resolution scoring aborted between pages');
      return pagesProcessed;
    }

    // Per page: fetch groups, score them, then apply merged group modifiers.
    const pageResult = await fetchNextResolutionPage({
      esClient,
      entityType,
      lookupIndex,
      pageSize,
      afterKey,
      targetEntityIds,
    });
    if (!pageResult) {
      break;
    }

    pagesProcessed += 1;
    afterKey = pageResult.afterKey;
    logger.debug(
      `[resolution][page:${pagesProcessed}] lookup buckets=${pageResult.bucketCount}, targets=${pageResult.resolutionTargetIds.length}`
    );

    const pageUpperBound =
      pageResult.resolutionTargetIds[pageResult.resolutionTargetIds.length - 1];
    const { parsedScores, esqlRows } = await scoreResolutionPage({
      esClient,
      entityType,
      resolutionTargetIds: pageResult.resolutionTargetIds,
      // Full runs page through every target in sort order, so each page is exactly the
      // targets in (previous upper bound, this upper bound]. Explicit target lists from
      // single-entity recalculation can be sparse and keep the ID list.
      bounds: targetEntityIds
        ? undefined
        : { lower: previousPageUpperBound, upper: pageUpperBound },
      // A full run shares its ID with the lookup rows Phase 0 wrote for it.
      calculationRunId,
      sampleSize,
      pageSize,
      alertsIndex,
      lookupIndex,
      alertFilters,
    });
    previousPageUpperBound = pageUpperBound;
    logger.debug(
      `[resolution][page:${pagesProcessed}] parsed_scores=${parsedScores.length}, esql_rows=${esqlRows}`
    );

    let modifiedScores: EntityRiskScoreRecord[] = [];
    if (parsedScores.length > 0) {
      const allMemberIds = collectMemberEntityIds(parsedScores);
      const lookupMemberIds = await fetchResolutionGroupMemberIds({
        esClient,
        logger,
        lookupIndex,
        resolutionTargetIds: pageResult.resolutionTargetIds,
      });
      for (const memberId of lookupMemberIds) {
        allMemberIds.add(memberId);
      }

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

/**
 * Builds a zero resolution score for each of the given targets that still carries a resolution
 * score from an earlier run.
 *
 * A group with no alert left to score produces no row in the scoring query, so its target keeps
 * the last resolution score. A full engine run clears that up in `resetToZero`; this lets a
 * targeted run do the same right away. The zero goes through the same group modifiers as a normal
 * score, so criticality and watchlists that sit on an alias still apply.
 */
export const buildZeroResolutionScores = async ({
  esClient,
  crudClient,
  logger,
  entityType,
  lookupIndex,
  now,
  calculationRunId,
  watchlistConfigs,
  resolutionTargetIds,
}: {
  esClient: ElasticsearchClient;
  crudClient: EntityUpdateClient;
  logger: ScopedLogger;
  entityType: EntityType;
  lookupIndex: string;
  now: string;
  calculationRunId: string;
  watchlistConfigs: Map<string, WatchlistObject>;
  resolutionTargetIds: string[];
}): Promise<EntityRiskScoreRecord[]> => {
  const { entities: targets } = await crudClient.listEntities({
    filter: { terms: { 'entity.id': resolutionTargetIds } },
    size: resolutionTargetIds.length,
    source: ['entity.id', 'entity.relationships.resolution.risk.calculated_score_norm'],
  });
  // A target that was never scored gets no zero, which would put a 0 on screen where there was
  // nothing before.
  const previouslyScoredIds = targets.flatMap(({ entity }) =>
    entity?.id && typeof entity.relationships?.resolution?.risk?.calculated_score_norm === 'number'
      ? [entity.id]
      : []
  );
  if (previouslyScoredIds.length === 0) {
    return [];
  }

  const lookupMemberIds = await fetchResolutionGroupMemberIds({
    esClient,
    logger,
    lookupIndex,
    resolutionTargetIds: previouslyScoredIds,
  });
  const memberEntities = await fetchEntitiesByIds({
    crudClient,
    entityIds: [...previouslyScoredIds, ...lookupMemberIds],
    logger,
    errorContext:
      'Error fetching entities for zero resolution scores. Skipping the zero score write',
  });

  // Without the target in hand we would write a score carrying none of the group's modifiers,
  // which is worse than leaving the previous score alone. The aliases need no entry of their own:
  // `applyResolutionModifiers` folds them in through their `resolved_to`.
  const parsedScores: ParsedResolutionScore[] = previouslyScoredIds
    .filter((targetId) => memberEntities.has(targetId))
    .map((targetId) => ({
      resolution_target_id: targetId,
      alert_count: 0,
      score: 0,
      normalized_score: 0,
      risk_inputs: [],
      related_entities: [],
    }));
  logger.debug(
    `[resolution] zero scores: previously_scored=${previouslyScoredIds.length}, built=${parsedScores.length}`
  );
  if (parsedScores.length === 0) {
    return [];
  }

  return applyResolutionModifiers({
    parsedScores,
    memberEntities,
    now,
    entityType,
    calculationRunId,
    watchlistConfigs,
  });
};

const fetchNextResolutionPage = async ({
  esClient,
  entityType,
  lookupIndex,
  pageSize,
  afterKey,
  targetEntityIds,
}: {
  esClient: ElasticsearchClient;
  entityType: EntityType;
  lookupIndex: string;
  pageSize: number;
  afterKey: Record<string, string> | undefined;
  targetEntityIds?: string[];
}): Promise<ResolutionPageResult | null> => {
  interface CompositeAgg {
    buckets: Array<{ key: Record<string, string> }>;
    after_key?: Record<string, string>;
  }

  const compositeResponse = await esClient.search(
    getResolutionCompositeQuery(
      entityType,
      lookupIndex,
      Math.min(pageSize, MAX_RESOLUTION_TARGETS_PER_PAGE),
      afterKey,
      targetEntityIds
    )
  );
  const compositeAgg = (
    compositeResponse.aggregations as { by_resolution_target?: CompositeAgg } | undefined
  )?.by_resolution_target;
  const buckets = compositeAgg?.buckets ?? [];
  if (buckets.length === 0) {
    return null;
  }

  return {
    resolutionTargetIds: buckets.map((bucket) => bucket.key.resolution_target_id),
    bucketCount: buckets.length,
    afterKey: compositeAgg?.after_key,
  };
};

export const fetchResolutionGroupMemberIds = async ({
  esClient,
  logger,
  lookupIndex,
  resolutionTargetIds,
}: {
  esClient: ElasticsearchClient;
  logger: ScopedLogger;
  lookupIndex: string;
  resolutionTargetIds: string[];
}): Promise<Set<string>> => {
  if (resolutionTargetIds.length === 0) {
    return new Set();
  }
  if (resolutionTargetIds.length > MAX_RESOLUTION_TARGETS_PER_PAGE) {
    throw new Error(
      `fetchResolutionGroupMemberIds received ${resolutionTargetIds.length} ids, exceeding cap ${MAX_RESOLUTION_TARGETS_PER_PAGE}`
    );
  }

  const memberIds = new Set<string>();
  let searchAfter: string | undefined;

  do {
    const response = await esClient.search<{
      entity_id?: string;
    }>({
      index: lookupIndex,
      size: RESOLUTION_GROUP_MEMBER_FETCH_PAGE_SIZE,
      _source: ['entity_id'],
      track_total_hits: false,
      sort: [{ entity_id: { order: 'asc' } }],
      // Strict undefined: a truthy check would fold an empty-string entity_id
      // (assigned via the typeof check below) into "no cursor" and re-page
      // from the start forever.
      search_after: searchAfter !== undefined ? [searchAfter] : undefined,
      query: {
        bool: {
          filter: [
            { terms: { resolution_target_id: resolutionTargetIds } },
            { term: { relationship_type: RESOLUTION_RELATIONSHIP_TYPE } },
          ],
        },
      },
    });

    const hits = response.hits.hits ?? [];
    for (const hit of hits) {
      const entityId = hit._source?.entity_id;
      if (typeof entityId === 'string') {
        memberIds.add(entityId);
      }
    }

    if (hits.length === 0) {
      searchAfter = undefined;
    } else {
      const nextSortValue = hits[hits.length - 1].sort?.[0];
      if (nextSortValue !== undefined && typeof nextSortValue !== 'string') {
        logger.warn(
          `Resolution member fetch: unexpected non-string sort value (${typeof nextSortValue}); terminating pagination`
        );
      }
      searchAfter = typeof nextSortValue === 'string' ? nextSortValue : undefined;
    }
  } while (searchAfter !== undefined);

  return memberIds;
};

const scoreResolutionPage = async ({
  esClient,
  entityType,
  resolutionTargetIds,
  bounds,
  calculationRunId,
  sampleSize,
  pageSize,
  alertsIndex,
  lookupIndex,
  alertFilters,
}: {
  esClient: ElasticsearchClient;
  entityType: EntityType;
  resolutionTargetIds: string[];
  bounds: { lower?: string; upper: string } | undefined;
  calculationRunId: string;
  sampleSize: number;
  pageSize: number;
  alertsIndex: string;
  lookupIndex: string;
  alertFilters: QueryDslQueryContainer[];
}): Promise<{ parsedScores: ParsedResolutionScore[]; esqlRows: number }> => {
  const query = bounds
    ? getResolutionScoreESQLByRange(
        entityType,
        bounds,
        calculationRunId,
        sampleSize,
        pageSize,
        alertsIndex,
        lookupIndex
      )
    : getResolutionScoreESQLByIds(
        entityType,
        resolutionTargetIds,
        sampleSize,
        pageSize,
        alertsIndex,
        lookupIndex
      );
  const esqlResponse = await esClient.esql.query(
    { query, filter: { bool: { filter: alertFilters } } },
    { requestTimeout: RISK_SCORING_REQUEST_TIMEOUT }
  );
  return {
    parsedScores: (esqlResponse.values ?? []).map(
      parseEsqlResolutionScoreRow(alertsIndex, sampleSize)
    ),
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
  const membersByResolutionTarget = new Map<string, string[]>();
  for (const [entityId, entity] of memberEntities) {
    const resolvedTo = entity.entity?.relationships?.resolution?.resolved_to;
    if (typeof resolvedTo === 'string' && entityId !== resolvedTo) {
      const members = membersByResolutionTarget.get(resolvedTo) ?? [];
      members.push(entityId);
      membersByResolutionTarget.set(resolvedTo, members);
    }
  }

  const mergedModifierEntities = new Map(
    parsedScores.map((score) => {
      const relatedEntityIds = new Set(
        score.related_entities.map((relatedEntity) => relatedEntity.entity_id)
      );
      const storeOnlyMembers = (membersByResolutionTarget.get(score.resolution_target_id) ?? [])
        .filter((entityId) => !relatedEntityIds.has(entityId))
        .map((entityId) => ({
          entity_id: entityId,
          relationship_type: RESOLUTION_RELATIONSHIP_TYPE,
        }));

      return [
        score.resolution_target_id,
        buildResolutionModifierEntity({
          score: {
            ...score,
            related_entities: [...score.related_entities, ...storeOnlyMembers],
          },
          memberEntities,
        }),
      ];
    })
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
