/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BasicPrettyPrinter, esql, type ComposerQuery } from '@elastic/esql';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { isEsqlUnknownIndexError } from '@kbn/storage-adapter';
import type {
  Feature,
  KnowledgeIndicator,
  QueryLink,
  SignificantEventsTuningConfig,
} from '@kbn/significant-events-schema';
import {
  isStoredFeatureKnowledgeIndicator,
  isStoredQueryKnowledgeIndicator,
  KNOWLEDGE_INDICATORS_DATA_STREAM,
} from '../data_stream';
import {
  andWhere,
  combineWhere,
  inPredicate,
  inSpace,
  IS_NOT_DELETED,
  IS_NOT_EXCLUDED,
  IS_NOT_EXPIRED,
} from '../esql_helpers';
import {
  DESCRIPTION,
  FEATURE_SUBTYPE,
  FEATURE_SLUG,
  FEATURE_TYPE,
  ID,
  KI_TYPE_FEATURE,
  KI_TYPE_QUERY,
  QUERY_ESQL,
  QUERY_RULE_BACKED,
  QUERY_RULE_ID,
  QUERY_TYPE,
  SEARCH_EMBEDDING,
  SOURCE_ID,
  TAGS,
  TIMESTAMP,
  TITLE,
  TYPE,
  type KnowledgeIndicatorType,
} from '../fields';
import { fromStoredFeature, fromStoredQuery } from './serializers';
import { searchWithKeywordFallback } from '../../streams/search_with_keyword_fallback';
import {
  esqlToObjects,
  pickLatestPerGroup,
  queryEsql,
  withWhere,
  type LatestSourceWhereCondition,
} from '../../significant_events/latest_source_query';
import type { SearchMode } from '../../../../common/queries';

import type { RevisionReader } from './revision_reader';
import type { RuleUnbackedFilter } from './types';

const SEARCH_SIZE_LIMIT = 10_000;
const CROSS_SOURCE_RANK_LIMIT = 300;
const QUERY_FEATURE_ID = 'query.features.id';
// `FUSE` preserves this label only when the semantic branch contributes the row.
const RANK_LABEL_COLUMN = 'label';
const SEMANTIC_LABEL = 'semantic';
// Semantic rank one ties keyword rank one and beats every other keyword-only row, so it is always
// within the top two of an equal-weight RRF page; a page of one can cut it and fool the tie gate.
const MIN_TIE_GATE_PAGE = 2;

type RankedIndicatorRow = Record<string, unknown> & {
  id?: string;
  'source.id'?: string;
  type?: KnowledgeIndicatorType;
  '@timestamp'?: string;
  [RANK_LABEL_COLUMN]?: string | null;
};

interface KeywordClause {
  readonly condition: LatestSourceWhereCondition;
  readonly boost: number;
}

interface KeywordExpressions {
  readonly condition: LatestSourceWhereCondition;
  readonly score: LatestSourceWhereCondition;
}

const combineKeywordClauses = (clauses: KeywordClause[]): KeywordExpressions => {
  const condition = clauses
    .map(({ condition: clause }) => `(${BasicPrettyPrinter.expression(clause)})`)
    .join(' OR ');
  const score = clauses
    .map(
      ({ condition: clause, boost }) =>
        `CASE(${BasicPrettyPrinter.expression(clause)}, ${boost.toFixed(1)}, 0.0)`
    )
    .join(' + ');

  return {
    condition: esql.exp(condition),
    score: esql.exp(score),
  };
};

// Columns ranking must return so the caller can key each row and match the phase-1 latest revision.
const rankGroupKeyColumns = () => [
  esql.col(ID),
  esql.col(SOURCE_ID),
  esql.col(TYPE),
  esql.col(TIMESTAMP),
];

export class IndicatorSearcher {
  constructor(
    private readonly esClient: ElasticsearchClient,
    private readonly logger: Logger,
    private readonly config: Pick<
      SignificantEventsTuningConfig,
      'semantic_min_score' | 'rrf_rank_constant'
    >,
    private readonly revisionReader: RevisionReader,
    private readonly space: string
  ) {}

  async findIndicators(
    sources: string | string[],
    query: string,
    options: {
      types?: KnowledgeIndicatorType[];
      searchMode?: SearchMode;
      limit?: number;
      includeExcluded?: boolean;
      featureTypes?: string[];
      featureIds?: string[];
      queryTypes?: string[];
      queryIds?: string[];
      ruleIds?: string[];
      ruleUnbacked?: RuleUnbackedFilter;
    } = {}
  ): Promise<{ hits: KnowledgeIndicator[] }> {
    const sourceIds = Array.isArray(sources) ? sources : [sources];
    if (sourceIds.length === 0) {
      return { hits: [] };
    }

    return searchWithKeywordFallback(
      this.logger,
      { searchMode: options.searchMode, label: 'KnowledgeIndicator', sourceIds },
      (mode) => this.executeFindIndicators(mode, sourceIds, query, options)
    );
  }

  async findFeatures(
    sources: string | string[],
    query: string,
    options: {
      searchMode?: SearchMode;
      limit?: number;
      includeExcluded?: boolean;
      featureTypes?: string[];
      featureIds?: string[];
    } = {}
  ): Promise<{ hits: Feature[] }> {
    const { hits } = await this.findIndicators(sources, query, {
      ...options,
      types: [KI_TYPE_FEATURE],
    });
    return {
      hits: hits.flatMap((h) => (h.type === 'feature' ? [h.feature] : [])),
    };
  }

  async findFeaturesAcrossSources(
    sourceIds: string[],
    query: string,
    options: { featureType: string; searchMode?: SearchMode; limit?: number }
  ): Promise<{ hits: Feature[] }> {
    if (sourceIds.length === 0) {
      return { hits: [] };
    }

    return searchWithKeywordFallback(
      this.logger,
      { searchMode: options.searchMode, label: 'KnowledgeIndicator', sourceIds },
      (mode) => this.executeFindFeaturesAcrossSources(mode, sourceIds, query, options)
    );
  }

  private async executeFindFeaturesAcrossSources(
    mode: SearchMode,
    sourceIds: string[],
    queryText: string,
    { featureType, limit }: { featureType: string; limit?: number }
  ): Promise<{ hits: Feature[] }> {
    const rankWhere = andWhere(
      combineWhere(inPredicate(SOURCE_ID, sourceIds), inPredicate(TYPE, [KI_TYPE_FEATURE])),
      inSpace(this.space)
    );

    // Latest-per-group is folded into the rank query itself, so no `ids` filter is needed.
    const rankedRows = await this.rankWithTieFallback(
      mode,
      CROSS_SOURCE_RANK_LIMIT,
      undefined,
      (semanticMinScore) =>
        this.buildRankQuery(
          mode,
          rankWhere,
          queryText,
          [KI_TYPE_FEATURE],
          CROSS_SOURCE_RANK_LIMIT,
          semanticMinScore,
          {
            latestPerGroupWhere: combineWhere(
              IS_NOT_DELETED,
              IS_NOT_EXCLUDED,
              IS_NOT_EXPIRED,
              inPredicate(FEATURE_TYPE, [featureType])
            ),
          }
        )
    );

    const rankedKeys = new Set<string>();
    const ids = new Set<string>();
    for (const row of rankedRows) {
      const id = row[ID];
      const sourceId = row[SOURCE_ID];
      if (typeof id !== 'string' || typeof sourceId !== 'string') {
        continue;
      }
      rankedKeys.add(`${sourceId}:${id}`);
      ids.add(id);
    }
    this.logger.debug(
      `Cross-source feature search: ${rankedKeys.size} distinct groups in ${rankedRows.length} ranked rows`
    );
    if (rankedKeys.size === 0) {
      return { hits: [] };
    }

    const latest = await this.revisionReader.fetchLatestRevisions(
      combineWhere(
        inPredicate(SOURCE_ID, sourceIds),
        inPredicate(TYPE, [KI_TYPE_FEATURE]),
        inPredicate(ID, Array.from(ids))
      ),
      combineWhere(
        IS_NOT_DELETED,
        IS_NOT_EXCLUDED,
        IS_NOT_EXPIRED,
        inPredicate(FEATURE_TYPE, [featureType])
      )
    );
    const latestByKey = new Map(
      latest
        .filter(isStoredFeatureKnowledgeIndicator)
        .map((doc) => [`${doc['source.id']}:${doc.id}`, doc])
    );

    const hits: Feature[] = [];
    for (const key of rankedKeys) {
      const doc = latestByKey.get(key);
      if (doc) hits.push(fromStoredFeature(doc));
    }
    return { hits: limit === undefined ? hits : hits.slice(0, limit) };
  }

  async findQueries(
    sources: string | string[],
    query: string,
    filters?: {
      ruleUnbacked?: RuleUnbackedFilter;
      queryTypes?: string[];
      queryIds?: string[];
      ruleIds?: string[];
    },
    searchMode?: SearchMode
  ): Promise<QueryLink[]> {
    const { hits } = await this.findIndicators(sources, query, {
      types: [KI_TYPE_QUERY],
      searchMode,
      queryTypes: filters?.queryTypes,
      queryIds: filters?.queryIds,
      ruleIds: filters?.ruleIds,
      ruleUnbacked: filters?.ruleUnbacked,
    });
    const queryLinks = hits.flatMap((h) => (h.type === 'query' ? [h.query] : []));
    return queryLinks;
  }

  private async executeFindIndicators(
    mode: SearchMode,
    sourceIds: string[],
    queryText: string,
    options: {
      types?: KnowledgeIndicatorType[];
      limit?: number;
      includeExcluded?: boolean;
      featureTypes?: string[];
      featureIds?: string[];
      queryTypes?: string[];
      queryIds?: string[];
      ruleIds?: string[];
      ruleUnbacked?: RuleUnbackedFilter;
    }
  ): Promise<{ hits: KnowledgeIndicator[] }> {
    const hasFeatureKind = options.types?.length === 1 && options.types[0] === KI_TYPE_FEATURE;
    const hasQueryKind = options.types?.length === 1 && options.types[0] === KI_TYPE_QUERY;

    // Default: drop tombstones and excluded revisions. Queries don't write
    // `excluded`, so the filter is a no-op for them. `includeExcluded`
    // relaxes back to drop-tombstones-only.
    const featureTypesFilter =
      hasFeatureKind && options.featureTypes?.length
        ? inPredicate(FEATURE_TYPE, options.featureTypes)
        : undefined;
    const featureIdsFilter =
      hasFeatureKind && options.featureIds?.length
        ? inPredicate(FEATURE_SLUG, options.featureIds)
        : undefined;
    const queryIdsFilter =
      hasQueryKind && options.queryIds?.length ? inPredicate(ID, options.queryIds) : undefined;
    const queryTypesFilter =
      hasQueryKind && options.queryTypes?.length
        ? inPredicate(QUERY_TYPE, options.queryTypes)
        : undefined;
    const ruleIdsFilter =
      hasQueryKind && options.ruleIds?.length
        ? inPredicate(QUERY_RULE_ID, options.ruleIds)
        : undefined;
    const ruleBackedFilter =
      hasQueryKind && options.ruleUnbacked === 'exclude'
        ? esql.exp`${esql.col(QUERY_RULE_BACKED)} == true`
        : hasQueryKind && options.ruleUnbacked === 'only'
        ? esql.exp`${esql.col(QUERY_RULE_BACKED)} == false`
        : undefined;

    // Phase 1: ES|QL latest-per-group reduction (space-scoped by the revision reader).
    const where = combineWhere(
      inPredicate(SOURCE_ID, sourceIds),
      inPredicate(TYPE, options.types ?? []),
      featureTypesFilter,
      featureIdsFilter,
      queryTypesFilter,
      queryIdsFilter,
      ruleIdsFilter
    );

    const postGroupingWhere = combineWhere(
      IS_NOT_DELETED,
      options.includeExcluded ? undefined : IS_NOT_EXCLUDED,
      ruleBackedFilter
    );

    const latestRevisions = await this.revisionReader.fetchLatestRevisionEntries(
      where,
      postGroupingWhere
    );
    const docs = latestRevisions.map(({ doc }) => doc);
    const docById = new Map(docs.map((d) => [`${d['source.id']}:${d.type}:${d.id}`, d]));

    if (docById.size === 0) {
      return { hits: [] };
    }

    const latestRevisionIds = latestRevisions.map(({ esId }) => esId);
    const limit = options.limit ?? SEARCH_SIZE_LIMIT;
    // `buildRankQuery` issues its own FROM and bypasses `RevisionReader`, so the space
    // filter has to be re-applied here.
    const phase2Where = andWhere(
      combineWhere(inPredicate(SOURCE_ID, sourceIds), inPredicate(TYPE, options.types ?? [])),
      inSpace(this.space)
    );

    const rankedRows = await this.rankWithTieFallback(
      mode,
      limit,
      latestRevisionIds,
      (semanticMinScore) =>
        this.buildRankQuery(
          mode,
          phase2Where,
          queryText,
          options.types ?? [],
          limit,
          semanticMinScore
        )
    );

    // Walk the ranked rows and surface each group once, in rank order. A row
    // only counts if its @timestamp matches the group's latest revision — that
    // keeps the search scoped to current state (a stale revision matching the
    // query must not resurface its group). We emit the authoritative latest doc
    // from phase 1 rather than the matched row, so a same-timestamp tie can't
    // surface a non-latest payload. A Set is enough to dedupe.
    const seen = new Set<string>();
    const hits: KnowledgeIndicator[] = [];
    for (const row of rankedRows) {
      const id = row[ID];
      const sourceId = row[SOURCE_ID];
      const type = row[TYPE];
      const timestamp = row[TIMESTAMP];
      if (
        typeof id !== 'string' ||
        typeof sourceId !== 'string' ||
        typeof type !== 'string' ||
        typeof timestamp !== 'string'
      ) {
        continue;
      }
      const key = `${sourceId}:${type}:${id}`;
      if (seen.has(key)) continue;
      const latest = docById.get(key);
      if (!latest || new Date(latest[TIMESTAMP]).getTime() !== new Date(timestamp).getTime()) {
        continue;
      }
      seen.add(key);
      if (isStoredFeatureKnowledgeIndicator(latest)) {
        hits.push({ type: 'feature', feature: fromStoredFeature(latest) });
      } else if (isStoredQueryKnowledgeIndicator(latest)) {
        hits.push({ type: 'query', query: fromStoredQuery(latest) });
      }
    }

    return { hits };
  }

  /**
   * Retries when minmax collapses an all-tied semantic branch to zero. The hybrid query over-fetches
   * to `MIN_TIE_GATE_PAGE` rows for the gate; the page is trimmed to `limit` here.
   * Replace the retry once https://github.com/elastic/elasticsearch/issues/135543 is resolved.
   */
  private async rankWithTieFallback(
    mode: SearchMode,
    limit: number,
    latestRevisionIds: string[] | undefined,
    build: (semanticMinScore: number) => ComposerQuery
  ): Promise<RankedIndicatorRow[]> {
    const filter = latestRevisionIds ? { ids: { values: latestRevisionIds } } : undefined;
    const rankedResponse = await queryEsql({
      esClient: this.esClient,
      query: build(this.config.semantic_min_score),
      filter,
    }).catch((error) => {
      // The cross-source path ranks before any revision read, so this is where a not-yet-created
      // data stream surfaces.
      if (isEsqlUnknownIndexError(error)) {
        this.logger.debug(
          `KnowledgeIndicator ${mode} search: data stream not created yet; returning no ranked rows`
        );
        return undefined;
      }
      throw error;
    });
    if (!rankedResponse) {
      return [];
    }
    const rankedRows = esqlToObjects<RankedIndicatorRow>(rankedResponse);
    if (mode === 'keyword' || rankedRows.some((row) => row[RANK_LABEL_COLUMN] === SEMANTIC_LABEL)) {
      return rankedRows.slice(0, limit);
    }
    this.logger.debug(
      `KnowledgeIndicator ${mode} search: semantic branch contributed no rows above ${this.config.semantic_min_score}; retrying without the threshold`
    );
    const retriedRows = esqlToObjects<RankedIndicatorRow>(
      await queryEsql({ esClient: this.esClient, query: build(0), filter })
    );
    return retriedRows.slice(0, limit);
  }

  private buildRankQuery(
    mode: SearchMode,
    where: LatestSourceWhereCondition,
    queryText: string,
    types: KnowledgeIndicatorType[],
    limit: number,
    semanticMinScore: number,
    options: { latestPerGroupWhere?: LatestSourceWhereCondition } = {}
  ): ComposerQuery {
    const label = esql.col(RANK_LABEL_COLUMN);
    const semanticLabel = esql.str(SEMANTIC_LABEL);

    let rankQuery = esql.from([KNOWLEDGE_INDICATORS_DATA_STREAM], ['_score', '_id', '_index'])
      .where`${where}`;
    if (options.latestPerGroupWhere) {
      rankQuery = pickLatestPerGroup(rankQuery, [SOURCE_ID, TYPE, ID]);
      rankQuery = withWhere(rankQuery, options.latestPerGroupWhere);
    }

    if (mode === 'semantic') {
      return rankQuery.pipe`FORK (
            WHERE MATCH(${esql.col(SEARCH_EMBEDDING)}, ${{ q: queryText }})
            | SORT _score DESC
            | LIMIT ${limit}
          )`.pipe`EVAL ${label} = ${semanticLabel}`.pipe`FUSE LINEAR WITH {"normalizer":"minmax"}`
        .where`_score >= ${semanticMinScore}`
        .pipe`KEEP _id, _index, _score, ${label}, ${rankGroupKeyColumns()}`
        .pipe`SORT _score DESC`.limit(limit);
    }

    const keyword = this.buildKeywordExpressions(queryText, types);
    if (mode === 'keyword') {
      return rankQuery.where`${keyword.condition}`.pipe`EVAL _score = ${keyword.score}`
        .where`_score > 0`.pipe`KEEP _id, _index, _score, ${rankGroupKeyColumns()}`
        .pipe`SORT _score DESC`.limit(limit);
    }

    // Threshold the semantic branch in-place (FUSE LINEAR + fake group) before RRF-fusing with keyword; final KEEP drops the FUSE keys _id/_index.
    return rankQuery.pipe`FORK
          (
            WHERE MATCH(${esql.col(SEARCH_EMBEDDING)}, ${{ q: queryText }})
            | SORT _score DESC
            | LIMIT ${limit}
            | EVAL ${label} = ${semanticLabel}
            | FUSE LINEAR GROUP BY ${label} WITH {"normalizer":"minmax"}
            | WHERE _score >= ${semanticMinScore}
            | KEEP _id, _index, _score, ${label}, ${rankGroupKeyColumns()}
            | SORT _score DESC
            | LIMIT ${limit}
          )
          (
            WHERE ${keyword.condition}
            | EVAL _score = ${keyword.score}
            | WHERE _score > 0
            | SORT _score DESC
            | LIMIT ${limit}
            | KEEP _id, _index, _score, ${rankGroupKeyColumns()}
          )
      `.pipe`FUSE RRF WITH {"rank_constant":${this.config.rrf_rank_constant}}`
      .pipe`SORT _score DESC`.pipe`KEEP ${rankGroupKeyColumns()}, _score, ${label}`.limit(
      Math.max(limit, MIN_TIE_GATE_PAGE)
    );
  }

  private buildKeywordExpressions(
    queryText: string,
    types: KnowledgeIndicatorType[]
  ): KeywordExpressions {
    const lowerQueryText = queryText.toLowerCase();
    const escaped = lowerQueryText.replace(/[\\*?]/g, '\\$&');
    const lowerWildcard = esql.str(`*${escaped}*`);
    const likeClause = (field: string, boost: number): KeywordClause => ({
      condition: esql.exp`TO_LOWER(${esql.col(field)}) LIKE ${lowerWildcard}`,
      boost,
    });

    const clauses: KeywordClause[] = [likeClause(TITLE, 3), likeClause(DESCRIPTION, 2)];
    const includeFeatures = types.length === 0 || types.includes(KI_TYPE_FEATURE);
    const includeQueries = types.length === 0 || types.includes(KI_TYPE_QUERY);

    if (includeFeatures) {
      // Join the multivalue so substring LIKE works; LIKE is null per-element, and MV_CONTAINS matched whole tags only.
      clauses.push(likeClause(FEATURE_TYPE, 1), likeClause(FEATURE_SUBTYPE, 1), {
        condition: esql.exp`MV_CONCAT(TO_LOWER(${esql.col(TAGS)}), " ") LIKE ${lowerWildcard}`,
        boost: 1,
      });
    }
    if (includeQueries) {
      clauses.push(likeClause(QUERY_ESQL, 1), likeClause(QUERY_FEATURE_ID, 1));
    }

    return combineKeywordClauses(clauses);
  }
}
