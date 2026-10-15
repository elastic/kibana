/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer, SearchTotalHits } from '@elastic/elasticsearch/lib/api/types';
import { orderBy, truncate, uniq } from 'lodash';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { Entity } from '@kbn/entity-store/common';
import { ENTITY_LATEST, getEntitiesAlias } from '@kbn/entity-store/common';
import type { EsQueryConfig } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import type { SignalCardId } from '../../../../../common/entity_analytics/home/constants';
import { SIGNAL_CARD_IDS } from '../../../../../common/entity_analytics/home/constants';
import type { EntityAnalyticsScope } from '../../../../../common/entity_analytics/ai_brief/scope';
import { getEntityType } from '../../../../../common/entity_analytics/entity_store/sanitize_entity_record_for_upsert';
import { getRiskScoreTimeSeriesIndex } from '../../../../../common/entity_analytics/risk_engine/indices';
import { resolveDisplayName } from '../../../../lib/entity_analytics/lead_generation/entity_conversion';
import { ENTITY_IDENTIFIER_TYPES } from '../entity_resolution';
import type { BriefCandidate, BriefEntityType } from './brief_types';
import { MAX_BRIEF_CANDIDATES } from './brief_types';
import { getCandidateRisk } from './build_facts';
import { getPeriodStart, getScopeFilters } from './describe_scope';

/** Display names come from source logs, so an attacker can choose them. */
const MAX_NAME_LENGTH = 80;

export interface CandidateEntities {
  /** Ranked and capped, narrowed by the page's query when it applied. */
  candidates: BriefCandidate[];
  /** Distinct entity ids captured from the available tiles. */
  capturedCount: number;
  /** Identities among the records read, once aliases fold into their golden entity. */
  identityCount: number;
  /** True when the cap on candidates left out flagged entities. */
  isTruncated: boolean;
  /** Captured ids with no Entity Store record. */
  notFoundCount: number;
  /** Captured ids with a record that the page's query, when applied, kept. An alias and its golden entity count twice. */
  matchedCount: number;
  /** True when the page had a search query or filter pills. */
  hasPageQuery: boolean;
  /** True when the page's query couldn't be built or run, so it didn't narrow the candidates. */
  pageQueryFailed: boolean;
  /** The earliest first seen on the entities index: when the Entity Store started extracting. */
  storeStartTimestamp?: string;
}

interface CandidateAggregations {
  found: { value: number };
  all_entities: { first_seen: { value_as_string?: string } };
}

/** Reads the Entity Store records of the scope's tile entities in one search as the user, and ranks them. */
export const fetchCandidateEntities = async ({
  scope,
  spaceId,
  esClient,
  logger,
}: {
  scope: EntityAnalyticsScope;
  spaceId: string;
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<CandidateEntities> => {
  const { focusTileId } = scope;
  const tileIdsByEntityId = selectCandidateTiles(scope);
  const entityIds = [...tileIdsByEntityId.keys()];
  const hasPageQuery = Boolean(scope.query?.query) || (scope.filters ?? []).length > 0;

  // Every record is read (at most 200 ids per tile, about 1 KB each) and ranked here. The page query is a
  // post filter: it narrows the hits, while `found` still counts every tile entity with a record.
  const search = (pageQuery: QueryDslQueryContainer | undefined) =>
    esClient.search<Entity, CandidateAggregations>({
      index: getEntitiesAlias(ENTITY_LATEST, spaceId),
      size: entityIds.length,
      ignore_unavailable: true,
      query: { bool: { filter: [{ terms: { 'entity.id': entityIds } }] } },
      post_filter: pageQuery,
      sort: [{ 'entity.id': 'asc' }],
      aggs: {
        found: { value_count: { field: 'entity.id' } },
        // `global` ignores the query, so this is when the whole entities index started.
        all_entities: {
          global: {},
          aggs: { first_seen: { min: { field: 'entity.lifecycle.first_seen' } } },
        },
      },
    });

  const pageQuery = hasPageQuery ? buildPageQuery(scope, logger) : undefined;
  let pageQueryFailed = hasPageQuery && !pageQuery;
  const response = await search(pageQuery).catch(async (error) => {
    if (!pageQuery) {
      throw error;
    }
    logger.debug(`AI brief: the page query failed, reading without it: ${error.message}`);
    pageQueryFailed = true;
    return search(undefined);
  });

  const candidates = response.hits.hits.flatMap(({ _source: record }): BriefCandidate[] => {
    const id = record?.entity?.id;
    const tileIds = id ? tileIdsByEntityId.get(id) : undefined;
    if (!record || !id || !tileIds) {
      return [];
    }
    const type = getBriefEntityType(record, id);
    const name = truncate(resolveDisplayName(record, type, id), { length: MAX_NAME_LENGTH });
    return [{ id, name, type, tileIds, record }];
  });

  const identities = foldAliases(candidates);
  const matchedCount = getTotal(response.hits.total);
  return {
    candidates: rankCandidates(identities, focusTileId),
    identityCount: identities.length,
    isTruncated: identities.length > MAX_BRIEF_CANDIDATES,
    capturedCount: entityIds.length,
    notFoundCount: entityIds.length - (response.aggregations?.found.value ?? 0),
    matchedCount,
    hasPageQuery,
    pageQueryFailed,
    storeStartTimestamp: response.aggregations?.all_entities.first_seen.value_as_string,
  };
};

/** As detection rules build queries server-side: the page has already accepted the query. */
const PAGE_QUERY_CONFIG: EsQueryConfig = {
  allowLeadingWildcards: true,
  queryStringOptions: { analyze_wildcard: true },
  ignoreFilterIfFieldNotInIndex: false,
  dateFormatTZ: 'Zulu',
};

const getTotal = (total: number | SearchTotalHits | undefined): number =>
  typeof total === 'number' ? total : total?.value ?? 0;

const buildPageQuery = (
  scope: EntityAnalyticsScope,
  logger: Logger
): QueryDslQueryContainer | undefined => {
  const { query } = scope;
  try {
    return buildEsQuery(
      undefined,
      query?.query ? [query] : [],
      getScopeFilters(scope),
      PAGE_QUERY_CONFIG
    );
  } catch (error) {
    logger.debug(`AI brief: the page query could not be built: ${error.message}`);
    return undefined;
  }
};

/** The record's entity type, falling back to the EUID prefix when the record has none. */
const getBriefEntityType = (record: Entity, id: string): BriefEntityType => {
  const isKnown = (type: unknown): type is BriefEntityType =>
    ENTITY_IDENTIFIER_TYPES.some((known) => known === type);
  try {
    const type = getEntityType(record);
    if (isKnown(type)) {
      return type;
    }
  } catch {
    // A record without a type falls back to the EUID prefix.
  }
  const prefix = id.split(':')[0];
  return isKnown(prefix) ? prefix : 'generic';
};

// Risk at the start of the period

const RISK_ENTITY_TYPES = ['host', 'user', 'service'] as const;
/** As on the Risk movers tile: scoring runs hourly, so two hours always hold a run. */
const BOUNDARY_WINDOW_MS = 2 * 3_600_000;

interface StartScoreAggregation {
  buckets: Array<{
    key: string;
    score_type: {
      buckets: Array<{
        key: string;
        last: {
          hits: {
            hits: Array<{
              _source?: Record<string, { risk?: { calculated_score_norm?: number } }>;
            }>;
          };
        };
      }>;
    };
  }>;
}

/**
 * Each candidate's score at the start of the period, by candidate id, in one search. It compares like with
 * like, resolution first: a group's resolution score, or an entity's own base score. The window follows
 * the Risk movers tile (`tile_risk_movers_query.ts`, in `public/`): the last score in the two hours before.
 */
export const fetchRiskAtStart = async ({
  candidates,
  scope,
  spaceId,
  esClient,
}: {
  candidates: BriefCandidate[];
  scope: EntityAnalyticsScope;
  spaceId: string;
  esClient: ElasticsearchClient;
}): Promise<Map<string, number>> => {
  const risks = candidates.flatMap((candidate) => {
    const risk = getCandidateRisk(candidate);
    return risk ? [{ candidateId: candidate.id, ...risk }] : [];
  });
  const scoredIds = uniq(risks.map(({ scoredId }) => scoredId));
  const start = getPeriodStart(scope);
  const response = await esClient.search<unknown, Record<string, StartScoreAggregation>>({
    index: getRiskScoreTimeSeriesIndex(spaceId),
    size: 0,
    ignore_unavailable: true,
    query: {
      bool: {
        filter: [
          {
            range: {
              '@timestamp': {
                gte: new Date(start.getTime() - BOUNDARY_WINDOW_MS).toISOString(),
                lte: start.toISOString(),
              },
            },
          },
          {
            bool: {
              should: RISK_ENTITY_TYPES.map((type) => ({
                terms: { [`${type}.risk.id_value`]: scoredIds },
              })),
              minimum_should_match: 1,
            },
          },
        ],
      },
    },
    aggs: Object.fromEntries(
      RISK_ENTITY_TYPES.map((type) => [
        type,
        {
          terms: { field: `${type}.risk.id_value`, include: scoredIds, size: scoredIds.length },
          aggs: {
            // Scores written before `score_type` existed are base scores.
            score_type: {
              terms: { field: `${type}.risk.score_type`, missing: 'base', size: 2 },
              aggs: {
                last: {
                  top_hits: {
                    size: 1,
                    sort: [{ '@timestamp': 'desc' as const }],
                    _source: [`${type}.risk.calculated_score_norm`],
                  },
                },
              },
            },
          },
        },
      ])
    ),
  });

  const scores = new Map<string, number>();
  for (const type of RISK_ENTITY_TYPES) {
    for (const { key: scoredId, score_type: scoreTypes } of response.aggregations?.[type]
      ?.buckets ?? []) {
      for (const { key: scoreType, last } of scoreTypes.buckets) {
        const score = last.hits.hits[0]?._source?.[type]?.risk?.calculated_score_norm;
        if (score !== undefined && Number.isFinite(score)) {
          scores.set(`${scoreType}:${scoredId}`, score);
        }
      }
    }
  }
  return new Map(
    risks.flatMap(({ candidateId, scoreType, scoredId }) => {
      const score = scores.get(`${scoreType}:${scoredId}`);
      return score === undefined ? [] : [[candidateId, score] as const];
    })
  );
};

// Candidate selection

/** Maps each entity id in the scope's available tiles to its tile ids. */
export const selectCandidateTiles = (scope: EntityAnalyticsScope): Map<string, SignalCardId[]> => {
  const { tiles } = scope;
  const tileIdsByEntityId = new Map<string, SignalCardId[]>();
  for (const tileId of SIGNAL_CARD_IDS) {
    const tile = tiles[tileId];
    const entityIds = tile && !tile.unavailable ? tile.entityIds : [];
    for (const entityId of entityIds) {
      tileIdsByEntityId.set(entityId, [...(tileIdsByEntityId.get(entityId) ?? []), tileId]);
    }
  }
  return tileIdsByEntityId;
};

/** The ranking key before risk: selected tile membership, then tile count. */
const getRankWeight = (
  tileIds: readonly SignalCardId[],
  focusTileId: SignalCardId | undefined
): number => (focusTileId !== undefined && tileIds.includes(focusTileId) ? 10 : 0) + tileIds.length;

/** Folds aliases into their golden entity, using its own record when read, otherwise the first alias's. */
export const foldAliases = (candidates: BriefCandidate[]): BriefCandidate[] => {
  const byIdentityId = new Map<string, BriefCandidate>();
  for (const candidate of candidates) {
    const identityId =
      candidate.record.entity?.relationships?.resolution?.resolved_to ?? candidate.id;
    const folded = byIdentityId.get(identityId);
    const tileIds = [...(folded?.tileIds ?? []), ...candidate.tileIds];
    const kept = candidate.id === identityId || !folded ? candidate : folded;
    byIdentityId.set(identityId, {
      ...kept,
      id: identityId,
      tileIds: SIGNAL_CARD_IDS.filter((tileId) => tileIds.includes(tileId)),
    });
  }
  return [...byIdentityId.values()];
};

/** Orders candidates by `getRankWeight`, then risk, and keeps the first `MAX_BRIEF_CANDIDATES`. */
export const rankCandidates = (
  candidates: BriefCandidate[],
  focusTileId: SignalCardId | undefined
): BriefCandidate[] =>
  orderBy(
    candidates,
    [
      ({ tileIds }) => getRankWeight(tileIds, focusTileId),
      (candidate) => getCandidateRisk(candidate)?.score ?? -1,
    ],
    ['desc', 'desc']
  ).slice(0, MAX_BRIEF_CANDIDATES);
