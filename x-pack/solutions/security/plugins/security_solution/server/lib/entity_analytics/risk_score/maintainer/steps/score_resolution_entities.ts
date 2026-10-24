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
import type { EsqlPageProfileSummary } from '../utils/esql_page_profile';
import { shouldProfilePage, summarizeEsqlPage } from '../utils/esql_page_profile';
import type { PageStepRecorder, PageStepTimings, PageTimer } from '../utils/page_step_timings';
import { createPageStepTimings } from '../utils/page_step_timings';
import { buildResolutionModifierEntity } from './resolution_modifiers';
import {
  getResolutionPageMemberFilter,
  MAX_RESOLUTION_PAGE_MEMBERS,
} from './resolution_member_filter';
import type { ResolutionPageChunk } from './resolution_store_pages';
import {
  byEntityId,
  chunkResolutionPage,
  discoverResolutionPagesFromStore,
  discoverSampledResolutionPages,
  halveResolutionChunk,
  readResolutionTargets,
  readSampledAliasPage,
} from './resolution_store_pages';
import type { SampledPagesConfig } from './sampled_page_bounds';
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
  /** Collects each page's step times; pass one in to read them after the stage. */
  pageTimings?: PageStepTimings;
  /**
   * Find each alert's resolution target by joining the entity store rather than the lookup
   * index. Full runs only; it relies on the page's member filter to leave out entities in no group.
   */
  joinEntityStore?: boolean;
  /** Reduce alerts to one row per entity before joining them to their resolution targets. */
  preAggregateByEntity?: boolean;
  /**
   * Full runs only: read each page's groups and their modifiers from the entity store, and join
   * the store in the scoring query, instead of using the Phase 0 lookup index. Assumes every alert
   * carries its stamped entity ID, which keeps the member filter exact.
   */
  membershipFromStore?: boolean;
  /**
   * With `membershipFromStore`: place every page's range from one sample of the aliases at the
   * start of the stage, instead of reading the next page's aliases one page after another.
   */
  sampledPages?: SampledPagesConfig;
}

interface ResolutionPageResult {
  resolutionTargetIds: string[];
  bucketCount: number;
  afterKey: Record<string, string> | undefined;
}

const RESOLUTION_GROUP_MEMBER_FETCH_PAGE_SIZE = 1000;

export interface ResolutionPageTask {
  pageNumber: number;
  resolutionTargetIds: string[];
  bounds: { lower?: string; upper: string } | undefined;
  timer: PageTimer;
  /** Pages found in the entity store: the page's aliases, with their modifiers. */
  aliasEntities?: Map<string, RiskScoreModifierEntity>;
  /** Sampled pages: the range of targets to read the aliases of when the page starts. */
  sampledRange?: { lower?: string; upper?: string };
  /** Profile this page's scoring queries regardless of its number. */
  profile?: boolean;
}

const readsMembershipFromStore = ({
  membershipFromStore,
  targetEntityIds,
}: ScoreResolutionEntitiesParams): boolean => membershipFromStore === true && !targetEntityIds;

/** Finds the resolution pages, one after another, each starting where the previous one ended. */
export const discoverResolutionPages = (
  params: ScoreResolutionEntitiesParams
): AsyncGenerator<ResolutionPageTask> =>
  readsMembershipFromStore(params)
    ? params.sampledPages
      ? discoverSampledResolutionPages({ ...params, config: params.sampledPages })
      : discoverResolutionPagesFromStore(params)
    : discoverResolutionPagesFromLookup(params);

/** Each composite aggregation over the lookup index needs the previous one's `after_key`. */
const discoverResolutionPagesFromLookup = async function* ({
  esClient,
  logger,
  entityType,
  lookupIndex,
  pageSize,
  abortSignal,
  targetEntityIds,
  pageTimings = createPageStepTimings(),
}: ScoreResolutionEntitiesParams): AsyncGenerator<ResolutionPageTask> {
  let afterKey: Record<string, string> | undefined;
  let previousPageUpperBound: string | undefined;
  let pageNumber = 0;

  do {
    if (abortSignal?.aborted) {
      logger.info('Resolution scoring aborted between pages');
      return;
    }

    const timer = pageTimings.startPage();
    const pageResult = await timer.time('discovery', () =>
      fetchNextResolutionPage({
        esClient,
        entityType,
        lookupIndex,
        pageSize,
        afterKey,
        targetEntityIds,
      })
    );
    if (!pageResult) {
      timer.drop();
      return;
    }

    pageNumber += 1;
    afterKey = pageResult.afterKey;
    logger.debug(
      `[resolution][page:${pageNumber}] lookup buckets=${pageResult.bucketCount}, targets=${pageResult.resolutionTargetIds.length}`
    );

    const pageUpperBound =
      pageResult.resolutionTargetIds[pageResult.resolutionTargetIds.length - 1];
    // Full runs page through every target in sort order, so each page is exactly the targets in
    // (previous upper bound, this upper bound]. Explicit target lists from single-entity
    // recalculation can be sparse and keep the ID list.
    const bounds = targetEntityIds
      ? undefined
      : { lower: previousPageUpperBound, upper: pageUpperBound };
    previousPageUpperBound = pageUpperBound;
    yield { pageNumber, resolutionTargetIds: pageResult.resolutionTargetIds, bounds, timer };
  } while (afterKey !== undefined);
};

/** Scores one resolution page: fetches its groups, scores them, then applies merged group modifiers. */
export const scoreResolutionPage = (
  params: ScoreResolutionEntitiesParams,
  task: ResolutionPageTask
): Promise<EntityRiskScoreRecord[]> =>
  readsMembershipFromStore(params)
    ? scoreResolutionPageFromStore(params, task)
    : scoreResolutionPageFromLookup(params, task);

/**
 * A sampled page reads its aliases first. Only targets with alerts produce rows, so a page can
 * hold many more targets than the scoring query returns: it's cut into parts only where its
 * members wouldn't fit one terms query, and a part whose result comes back full is halved and
 * scored again. Other store pages came with their aliases.
 */
const scoreResolutionPageFromStore = async (
  params: ScoreResolutionEntitiesParams,
  task: ResolutionPageTask
): Promise<EntityRiskScoreRecord[]> => {
  if (!task.sampledRange) {
    return scoreStoreGroups(params, task);
  }
  const { sampledRange, timer, pageNumber } = task;
  const page = await timer.time(
    'discovery',
    () =>
      readSampledAliasPage({
        crudClient: params.crudClient,
        entityType: params.entityType,
        range: sampledRange,
      }),
    (result) => result.tookMs
  );
  const chunks = chunkResolutionPage({
    lower: sampledRange.lower,
    aliases: page.aliases,
    targetIds: page.targetIds,
    maxMembers: MAX_RESOLUTION_PAGE_MEMBERS,
  });
  if (chunks.length > 1) {
    params.logger.info(
      `[resolution][page:${pageNumber}] read ${page.aliases.length} aliases of ${page.targetIds.length} targets; scoring it in ${chunks.length} parts`
    );
  }
  const rowLimit = Math.min(params.pageSize, MAX_RESOLUTION_TARGETS_PER_PAGE);
  const scoreChunk = async (chunk: ResolutionPageChunk): Promise<EntityRiskScoreRecord[]> => {
    const scores = await scoreStoreGroups(params, {
      ...task,
      resolutionTargetIds: chunk.targetIds,
      bounds: chunk.bounds,
      aliasEntities: chunk.aliasEntities,
    });
    const halves = scores.length >= rowLimit ? halveResolutionChunk(chunk) : undefined;
    if (!halves) {
      return scores;
    }
    params.logger.info(
      `[resolution][page:${pageNumber}] a part of ${chunk.targetIds.length} targets reached ${rowLimit} rows; scoring it in two halves`
    );
    const left = await scoreChunk(halves[0]);
    const right = await scoreChunk(halves[1]);
    return [...left, ...right];
  };
  const scores: EntityRiskScoreRecord[] = [];
  for (const chunk of chunks) {
    scores.push(...(await scoreChunk(chunk)));
  }
  return scores;
};

/**
 * The page's aliases are in hand. Reads the targets' own modifiers, scores the page's range with
 * the store joined, and merges each group's modifiers from both reads.
 */
const scoreStoreGroups = async (
  {
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
    alertFilters,
    preAggregateByEntity = false,
  }: ScoreResolutionEntitiesParams,
  {
    pageNumber,
    resolutionTargetIds,
    bounds,
    timer,
    aliasEntities = new Map(),
    profile: profileThisPage,
  }: ResolutionPageTask
): Promise<EntityRiskScoreRecord[]> => {
  const targets = await timer.time(
    'memberFetch',
    () => readResolutionTargets({ crudClient, targetIds: resolutionTargetIds }),
    (result) => result.tookMs
  );
  const memberEntities = new Map([...aliasEntities, ...byEntityId(targets.entities)]);
  logger.debug(
    `[resolution][page:${pageNumber}] store targets_requested=${resolutionTargetIds.length}, fetched=${targets.entities.length}, took=${targets.tookMs}ms`
  );

  const pageMemberIds = [...new Set([...resolutionTargetIds, ...aliasEntities.keys()])];
  // The store join can't tell a target from an entity in no group, so only the member filter keeps
  // the latter's alerts out. Without one, the page would score entities that aren't targets.
  const memberFilter = getResolutionPageMemberFilter(entityType, pageMemberIds);
  if (!memberFilter) {
    logger.warn(
      `[resolution][page:${pageNumber}] skipped: members=${pageMemberIds.length} exceed a terms query`
    );
    return [];
  }

  const { parsedScores, esqlRows, profileSummary } = await runResolutionScoringQuery({
    esClient,
    entityType,
    resolutionTargetIds,
    bounds,
    entityStoreIndex: await crudClient.latestIndexName(),
    preAggregate: preAggregateByEntity,
    calculationRunId,
    sampleSize,
    pageSize,
    alertsIndex,
    lookupIndex,
    alertFilters: [...alertFilters, memberFilter],
    profile: profileThisPage ?? shouldProfilePage(pageNumber),
    timer,
  });
  if (profileSummary) {
    logger.info(
      `[resolution][page:${pageNumber}] esql profile ${JSON.stringify({
        ...profileSummary,
        members: pageMemberIds.length,
        memberFilter: true,
      })}`
    );
  }
  logger.debug(
    `[resolution][page:${pageNumber}] parsed_scores=${parsedScores.length}, esql_rows=${esqlRows}`
  );
  if (parsedScores.length === 0) {
    return [];
  }

  return timer.timeSync('modifiers', () =>
    applyResolutionModifiers({
      parsedScores,
      memberEntities,
      now,
      entityType,
      calculationRunId,
      watchlistConfigs,
    })
  );
};

const scoreResolutionPageFromLookup = async (
  {
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
    alertFilters,
    joinEntityStore = false,
    preAggregateByEntity = false,
  }: ScoreResolutionEntitiesParams,
  { pageNumber, resolutionTargetIds, bounds, timer }: ResolutionPageTask
): Promise<EntityRiskScoreRecord[]> => {
  // Fetched before scoring so the query can skip alerts outside the page's groups, and reused
  // for the group modifiers below.
  const lookupMemberIds = await timer.time('memberFetch', () =>
    fetchResolutionGroupMemberIds({
      esClient,
      logger,
      lookupIndex,
      resolutionTargetIds,
    })
  );
  const pageMemberIds = [...new Set([...resolutionTargetIds, ...lookupMemberIds])];
  const memberFilter = getResolutionPageMemberFilter(entityType, pageMemberIds);
  if (!memberFilter) {
    logger.debug(
      `[resolution][page:${pageNumber}] members=${pageMemberIds.length} exceed a terms query, reading every alert`
    );
  }

  // Both need the member filter: the store join to leave out entities in no group, and the
  // per-entity aggregation to stay within the page's members' alerts. A page too big for one keeps
  // the lookup join and aggregates by target directly.
  const entityStoreIndex =
    joinEntityStore && memberFilter ? await crudClient.latestIndexName() : undefined;
  const { parsedScores, esqlRows, profileSummary } = await runResolutionScoringQuery({
    esClient,
    entityType,
    resolutionTargetIds,
    bounds,
    entityStoreIndex,
    preAggregate: preAggregateByEntity && memberFilter !== undefined,
    // A full run shares its ID with the lookup rows Phase 0 wrote for it.
    calculationRunId,
    sampleSize,
    pageSize,
    alertsIndex,
    lookupIndex,
    alertFilters: memberFilter ? [...alertFilters, memberFilter] : alertFilters,
    profile: shouldProfilePage(pageNumber),
    timer,
  });
  if (profileSummary) {
    logger.info(
      `[resolution][page:${pageNumber}] esql profile ${JSON.stringify({
        ...profileSummary,
        members: pageMemberIds.length,
        memberFilter: memberFilter !== undefined,
      })}`
    );
  }
  logger.debug(
    `[resolution][page:${pageNumber}] parsed_scores=${parsedScores.length}, esql_rows=${esqlRows}`
  );

  if (parsedScores.length === 0) {
    return [];
  }

  const allMemberIds = collectMemberEntityIds(parsedScores);
  for (const memberId of lookupMemberIds) {
    allMemberIds.add(memberId);
  }

  const memberEntities = await timer.time('entityFetch', () =>
    fetchEntitiesByIds({
      crudClient,
      entityIds: [...allMemberIds],
      logger,
      errorContext:
        'Error fetching entities for resolution modifier application. Resolution scoring will proceed without modifiers',
    })
  );
  logger.debug(
    `[resolution][page:${pageNumber}] member_entities_requested=${allMemberIds.size}, fetched=${memberEntities.size}`
  );

  const modifiedScores = timer.timeSync('modifiers', () =>
    applyResolutionModifiers({
      parsedScores,
      memberEntities,
      now,
      entityType,
      calculationRunId,
      watchlistConfigs,
    })
  );
  logger.debug(`[resolution][page:${pageNumber}] modified_scores=${modifiedScores.length}`);
  return modifiedScores;
};

/** Streams resolution scores for one entity type, one page per yield. */
export const calculateResolutionEntityScores = async function* (
  params: ScoreResolutionEntitiesParams
): AsyncGenerator<EntityRiskScoreRecord[], number> {
  let pagesProcessed = 0;
  for await (const task of discoverResolutionPages(params)) {
    pagesProcessed += 1;
    yield await scoreResolutionPage(params, task);
    task.timer.end();
  }
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

const runResolutionScoringQuery = async ({
  esClient,
  entityType,
  resolutionTargetIds,
  bounds,
  entityStoreIndex,
  preAggregate,
  calculationRunId,
  sampleSize,
  pageSize,
  alertsIndex,
  lookupIndex,
  alertFilters,
  profile,
  timer,
}: {
  esClient: ElasticsearchClient;
  entityType: EntityType;
  resolutionTargetIds: string[];
  bounds: { lower?: string; upper: string } | undefined;
  entityStoreIndex: string | undefined;
  preAggregate: boolean;
  calculationRunId: string;
  sampleSize: number;
  pageSize: number;
  alertsIndex: string;
  lookupIndex: string;
  alertFilters: QueryDslQueryContainer[];
  profile: boolean;
  timer: PageStepRecorder;
}): Promise<{
  parsedScores: ParsedResolutionScore[];
  esqlRows: number;
  profileSummary?: EsqlPageProfileSummary;
}> => {
  const query = bounds
    ? getResolutionScoreESQLByRange(
        entityType,
        bounds,
        calculationRunId,
        sampleSize,
        pageSize,
        alertsIndex,
        lookupIndex,
        { entityStoreIndex, preAggregate }
      )
    : getResolutionScoreESQLByIds(
        entityType,
        resolutionTargetIds,
        sampleSize,
        pageSize,
        alertsIndex,
        lookupIndex
      );
  const startedAt = Date.now();
  const esqlResponse = await timer.time(
    'esql',
    () =>
      esClient.esql.query(
        {
          query,
          filter: { bool: { filter: alertFilters } },
          ...(profile ? { profile: true } : {}),
        },
        { requestTimeout: RISK_SCORING_REQUEST_TIMEOUT }
      ),
    (response) => response.took
  );
  const wallMs = Date.now() - startedAt;
  return {
    parsedScores: timer.timeSync('parse', () =>
      (esqlResponse.values ?? []).map(parseEsqlResolutionScoreRow(alertsIndex, sampleSize))
    ),
    esqlRows: esqlResponse.values?.length ?? 0,
    profileSummary: profile ? summarizeEsqlPage(esqlResponse, wallMs) : undefined,
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
