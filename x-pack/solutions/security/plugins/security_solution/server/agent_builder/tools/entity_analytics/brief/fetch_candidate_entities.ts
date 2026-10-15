/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  QueryDslQueryContainer,
  SearchTotalHits,
  SortCombinations,
} from '@elastic/elasticsearch/lib/api/types';
import { truncate } from 'lodash';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { Entity } from '@kbn/entity-store/common';
import { ENTITY_LATEST, getEntitiesAlias } from '@kbn/entity-store/common';
import type { EsQueryConfig } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import type { EntityAnalyticsScope } from '../../../../../common/entity_analytics/ai_brief/scope';
import { getEntityType } from '../../../../../common/entity_analytics/entity_store/sanitize_entity_record_for_upsert';
import { resolveDisplayName } from '../../../../lib/entity_analytics/lead_generation/entity_conversion';
import { ENTITY_IDENTIFIER_TYPES } from '../entity_resolution';
import type { BriefCandidate, BriefEntityType } from './brief_types';
import { MAX_BRIEF_CANDIDATES } from './brief_types';
import { getScopeFilters } from './describe_scope';
import {
  foldAliases,
  getRankWeight,
  rankCandidates,
  selectCandidateTiles,
} from './select_candidates';

/** Records read for ranking. Tiles can hold hundreds of entities, so the first by rank are read. */
const MAX_RANKED_RECORDS = 100;
/** Display names come from source logs, so an attacker can choose them. */
const MAX_NAME_LENGTH = 80;

/** The `rankCandidates` order as one sort value: `getRankWeight`, then `getRankRisk`. */
const buildRankSort = (weights: Record<string, number>): SortCombinations => ({
  _script: {
    type: 'number',
    order: 'desc',
    script: {
      lang: 'painless',
      source: `
        double risk = -1;
        for (String field : params.riskFields) {
          if (doc.containsKey(field) && doc[field].size() > 0) { risk = doc[field].value; break; }
        }
        def weight = params.weights.get(doc['entity.id'].value);
        return (weight == null ? 0 : weight) * 1000 + risk;`,
      params: {
        weights,
        riskFields: [
          'entity.relationships.resolution.risk.calculated_score_norm',
          'entity.risk.calculated_score_norm',
        ],
      },
    },
  },
});

export interface CandidateEntities {
  /** Ranked and capped, narrowed by the page's query when it applied. */
  candidates: BriefCandidate[];
  /** Distinct entity ids captured from the available tiles. */
  capturedCount: number;
  /** Identities among the records read, once aliases fold into their golden entity. */
  identityCount: number;
  /** True when a cap left out entities: more matching records than were read, or more identities than candidates. */
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

/** Reads the Entity Store records of the scope's tile entities, first by rank, in one search as the requesting user. */
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
  const weights = Object.fromEntries(
    [...tileIdsByEntityId].map(([entityId, tileIds]) => [
      entityId,
      getRankWeight(tileIds, focusTileId),
    ])
  );
  const hasPageQuery = Boolean(scope.query?.query) || (scope.filters ?? []).length > 0;

  // The page query is a post filter: it narrows the ranked hits, while `found` still counts every
  // tile entity with a record.
  const search = (pageQuery: QueryDslQueryContainer | undefined) =>
    esClient.search<Entity, CandidateAggregations>({
      index: getEntitiesAlias(ENTITY_LATEST, spaceId),
      size: Math.min(entityIds.length, MAX_RANKED_RECORDS),
      ignore_unavailable: true,
      query: { bool: { filter: [{ terms: { 'entity.id': entityIds } }] } },
      post_filter: pageQuery,
      sort: [buildRankSort(weights), { 'entity.id': 'asc' }],
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

  const identities = foldAliases(candidates, focusTileId);
  const matchedCount = getTotal(response.hits.total);
  return {
    candidates: rankCandidates(identities, focusTileId),
    identityCount: identities.length,
    isTruncated:
      matchedCount > response.hits.hits.length || identities.length > MAX_BRIEF_CANDIDATES,
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
