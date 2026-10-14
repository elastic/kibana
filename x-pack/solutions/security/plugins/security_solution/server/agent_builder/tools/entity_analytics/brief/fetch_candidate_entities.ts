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
import { getScopeFilters } from './describe_scope';
import { rankCandidates, selectCandidateTiles } from './select_candidates';

/** Records read for ranking. Tiles can hold hundreds of entities, so the riskiest are read first. */
const MAX_RANKED_RECORDS = 100;

/** The resolution group's risk when scored, otherwise the entity's own, as `getEntityRisk` reads it. */
const RISK_SORT: SortCombinations = {
  _script: {
    type: 'number',
    order: 'desc',
    script: {
      lang: 'painless',
      source: `
        for (String field : params.fields) {
          if (doc.containsKey(field) && doc[field].size() > 0) { return doc[field].value; }
        }
        return -1;`,
      params: {
        fields: [
          'entity.relationships.resolution.risk.calculated_score_norm',
          'entity.risk.calculated_score_norm',
        ],
      },
    },
  },
};

export interface CandidateEntities {
  /** Ranked and capped, narrowed by the page's query when it applied. */
  candidates: BriefCandidate[];
  /** Distinct entity ids captured from the available tiles. */
  capturedCount: number;
  /** Captured ids with no Entity Store record. */
  notFoundCount: number;
  /** Captured ids with a record that the page's query, when applied, kept. */
  matchedCount: number;
  /** True when the page had a search query or filter pills. */
  hasPageQuery: boolean;
  /** True when the page's query couldn't be built or run, so it didn't narrow the candidates. */
  pageQueryFailed: boolean;
  /** The latest `@timestamp` on the entities index, when known. */
  dataTimestamp?: string;
}

interface CandidateAggregations {
  found: { value: number };
  all_entities: { latest: { value_as_string?: string } };
}

/** Reads the riskiest Entity Store records of the scope's tile entities in one search, as the requesting user. */
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
  const tileIdsByEntityId = selectCandidateTiles(scope);
  const entityIds = [...tileIdsByEntityId.keys()];
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
      sort: [RISK_SORT, { 'entity.id': 'asc' }],
      aggs: {
        found: { value_count: { field: 'entity.id' } },
        // `global` ignores the query, so this is the freshness of the whole entities index.
        all_entities: { global: {}, aggs: { latest: { max: { field: '@timestamp' } } } },
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
    return [{ id, name: resolveDisplayName(record, type, id), type, tileIds, record }];
  });

  return {
    candidates: rankCandidates(candidates, scope.focusTileId),
    capturedCount: entityIds.length,
    notFoundCount: entityIds.length - (response.aggregations?.found.value ?? 0),
    matchedCount: getTotal(response.hits.total),
    hasPageQuery,
    pageQueryFailed,
    dataTimestamp: response.aggregations?.all_entities.latest.value_as_string,
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
