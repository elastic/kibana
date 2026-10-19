/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer, SearchTotalHits } from '@elastic/elasticsearch/lib/api/types';
import { orderBy, truncate, uniq } from 'lodash';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Entity, EntityRiskLevels } from '@kbn/entity-store/common';
import { ENTITY_LATEST, getEntitiesAlias } from '@kbn/entity-store/common';
import type { EsQueryConfig } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import type { SignalCardId } from '../../../../../common/entity_analytics/home/constants';
import { SIGNAL_CARD_IDS } from '../../../../../common/entity_analytics/home/constants';
import type { EntityAnalyticsScope } from '../../../../../common/entity_analytics/ai_brief/scope';
import { getEntityType } from '../../../../../common/entity_analytics/entity_store/sanitize_entity_record_for_upsert';
import { getRiskLevel } from '../../../../../common/entity_analytics/risk_engine/risk_levels';
import { getRiskScoreTimeSeriesIndex } from '../../../../../common/entity_analytics/risk_engine/indices';
import { resolveDisplayName } from '../../../../lib/entity_analytics/lead_generation/entity_conversion';
import { ENTITY_IDENTIFIER_TYPES } from '../entity_resolution';
import type { BriefCandidate, BriefEntityType } from './types';
import { MAX_BRIEF_CANDIDATES } from './types';
import { getPeriodStart, getScopeFilters } from './describe_scope';

/** Display names come from source logs, so an attacker can choose them. */
const MAX_NAME_LENGTH = 80;

export interface CandidateEntities {
  /** Ranked and capped at `MAX_BRIEF_CANDIDATES`, narrowed by the page's search. */
  candidates: BriefCandidate[];
  /** Distinct entity ids in the view's tiles. */
  capturedCount: number;
  /** True when the cap left out flagged entities. */
  isTruncated: boolean;
  /** Ids with no Entity Store record. */
  notFoundCount: number;
  /** Records the page's search kept. */
  matchedCount: number;
  hasPageQuery: boolean;
}

/** Reads the Entity Store records of the view's flagged entities, as the user, and ranks them. */
export const readEntities = async ({
  scope,
  spaceId,
  esClient,
}: {
  scope: EntityAnalyticsScope;
  spaceId: string;
  esClient: ElasticsearchClient;
}): Promise<CandidateEntities> => {
  const tileIdsByEntityId = selectCandidateTiles(scope);
  const entityIds = [...tileIdsByEntityId.keys()];
  const hasPageQuery = Boolean(scope.query?.query) || (scope.filters ?? []).length > 0;

  // Every record is read (at most 200 ids per tile, about 1 KB each). The search narrows the hits, while
  // `found` counts every flagged entity with a record.
  const response = await esClient.search<Entity, { found: { value: number } }>({
    index: getEntitiesAlias(ENTITY_LATEST, spaceId),
    size: entityIds.length,
    ignore_unavailable: true,
    query: { bool: { filter: [{ terms: { 'entity.id': entityIds } }] } },
    post_filter: hasPageQuery ? buildPageQuery(scope) : undefined,
    sort: [{ 'entity.id': 'asc' }],
    aggs: { found: { value_count: { field: 'entity.id' } } },
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

  return {
    candidates: rankCandidates(candidates, scope.focusTileId),
    capturedCount: entityIds.length,
    isTruncated: candidates.length > MAX_BRIEF_CANDIDATES,
    notFoundCount: entityIds.length - (response.aggregations?.found.value ?? 0),
    matchedCount: getTotal(response.hits.total),
    hasPageQuery,
  };
};

/** Maps each entity id in the view's available tiles to its tile ids. */
export const selectCandidateTiles = ({
  tiles,
}: EntityAnalyticsScope): Map<string, SignalCardId[]> => {
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

/** Ranks by the selected tile, then how many tiles flag the entity, then risk, and keeps the first few. */
export const rankCandidates = (
  candidates: BriefCandidate[],
  focusTileId: SignalCardId | undefined
): BriefCandidate[] =>
  orderBy(
    candidates,
    [
      ({ tileIds }) => (focusTileId && tileIds.includes(focusTileId) ? 10 : 0) + tileIds.length,
      (candidate) => getCandidateRisk(candidate)?.score ?? -1,
    ],
    ['desc', 'desc']
  ).slice(0, MAX_BRIEF_CANDIDATES);

/** The risk the brief states for a candidate, and where its scores are stored. */
export interface CandidateRisk {
  of: 'entity' | 'resolution group';
  score: number;
  level: EntityRiskLevels;
  scoreType: 'base' | 'resolution';
  /** The golden entity's id for a group, the record's own id otherwise. */
  scoredId: string;
}

/** Resolution first: a scored resolution group's risk, otherwise the entity's own. */
export const getCandidateRisk = ({ id, record }: BriefCandidate): CandidateRisk | undefined => {
  const group = record.entity?.relationships?.resolution?.risk;
  if (group?.calculated_score_norm !== undefined) {
    const score = group.calculated_score_norm;
    return {
      of: 'resolution group',
      score,
      level: group.calculated_level ?? getRiskLevel(score),
      scoreType: 'resolution',
      scoredId: id,
    };
  }
  const own = record.entity?.risk;
  if (own?.calculated_score_norm === undefined) {
    return undefined;
  }
  const score = own.calculated_score_norm;
  return {
    of: 'entity',
    score,
    level: own.calculated_level ?? getRiskLevel(score),
    scoreType: 'base',
    scoredId: record.entity?.id ?? id,
  };
};

const RISK_ENTITY_TYPES = ['host', 'user', 'service'] as const;
/** As the Risk movers tile: scoring runs hourly, so two hours always hold a run. */
const BOUNDARY_WINDOW_MS = 2 * 3_600_000;

type ScoreSource = Record<string, { risk?: { calculated_score_norm?: number } }>;
interface StartScoreAggregation {
  buckets: Array<{
    key: string;
    score_type: {
      buckets: Array<{ key: string; last: { hits: { hits: Array<{ _source?: ScoreSource }> } } }>;
    };
  }>;
}

/**
 * Each candidate's risk score at the start of the period, by candidate id, compared like with like: a
 * group's resolution score or an entity's own base score. The window follows the Risk movers tile
 * (`tile_risk_movers_query.ts`): the last score in the two hours before the start.
 */
export const readRiskAtStart = async ({
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
    for (const { key: scoredId, score_type: byScoreType } of response.aggregations?.[type]
      ?.buckets ?? []) {
      for (const { key: scoreType, last } of byScoreType.buckets) {
        const score = last.hits.hits[0]?._source?.[type]?.risk?.calculated_score_norm;
        if (score !== undefined) {
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

/** As detection rules build queries server-side: the page has already accepted the query. */
const PAGE_QUERY_CONFIG: EsQueryConfig = {
  allowLeadingWildcards: true,
  queryStringOptions: { analyze_wildcard: true },
  ignoreFilterIfFieldNotInIndex: false,
  dateFormatTZ: 'Zulu',
};

const buildPageQuery = (scope: EntityAnalyticsScope): QueryDslQueryContainer =>
  buildEsQuery(
    undefined,
    scope.query?.query ? [scope.query] : [],
    getScopeFilters(scope),
    PAGE_QUERY_CONFIG
  );

const getTotal = (total: number | SearchTotalHits | undefined): number =>
  typeof total === 'number' ? total : total?.value ?? 0;

/** The record's entity type, or the EUID prefix when the record has none. */
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
