/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchRequest, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import type { GenericBuckets, GroupingQuery, RootAggregation } from '@kbn/grouping/src';
import { useQuery } from '@kbn/react-query';
import { lastValueFrom } from 'rxjs';
import { showErrorToast } from '@kbn/cloud-security-posture';
import { useContext, useMemo } from 'react';
import { getESQLResults } from '@kbn/esql-utils';
import type { EntityType } from '../../../../../../common/entity_analytics/types';
import type { ESBoolQuery } from '../../../../../../common/typed_json';
import { useKibana } from '../../../../../common/lib/kibana';
import {
  ALLOWED_ENTITY_TYPES,
  ENTITY_FIELDS,
  ENTITY_GROUPING_OPTIONS,
  ENTITY_TYPE_TERMS_CLAUSE,
  QUERY_KEY_GROUPING_DATA,
  QUERY_KEY_ENTITY_ANALYTICS,
  QUERY_KEY_FILTERED_RESOLUTION_GROUPS,
  QUERY_KEY_UNFILTERED_RESOLUTION_GROUPS,
} from '../constants';
import { DataViewContext } from '..';
import { esqlResponseToRecords } from '../../../../../common/utils/esql';

export type EntitiesGroupingQuery = GroupingQuery | SearchRequest;

export interface EntitiesGroupingAggregation {
  entityType?: {
    buckets?: GenericBuckets[];
  };
  resolutionRiskScore?: {
    value: number | null;
  };
}

export interface TargetEntityMetadata {
  name: string;
  type: EntityType;
  riskScore: number | null;
  individualRiskScore: number | null;
}

export type TargetMetadataMap = Map<string, TargetEntityMetadata>;

/** Entity-store data is fetched from the origin cluster only (no cross-cluster replicas). */
const ESQL_PROJECT_ROUTING = '_alias:_origin' as const;

interface TargetEntitySource {
  entity?: {
    id?: string;
    name?: string;
    EngineMetadata?: { Type?: EntityType };
    risk?: {
      calculated_score_norm?: number;
    };
    relationships?: {
      resolution?: {
        risk?: {
          calculated_score_norm?: number;
        };
      };
    };
  };
}

export const parseTargetMetadataHits = (hits: Array<{ _source?: unknown }>): TargetMetadataMap => {
  const result: TargetMetadataMap = new Map();
  for (const hit of hits) {
    const { id, name, EngineMetadata, risk, relationships } =
      (hit._source as TargetEntitySource)?.entity ?? {};
    const type = EngineMetadata?.Type;
    const riskScore = relationships?.resolution?.risk?.calculated_score_norm ?? null;
    const individualRiskScore = risk?.calculated_score_norm ?? null;

    if (id && name && type) {
      result.set(id, { name, type, riskScore, individualRiskScore });
    }
  }
  return result;
};

export type EntitiesRootGroupingAggregation = RootAggregation<EntitiesGroupingAggregation>;

export const getGroupedEntitiesQuery = (query: EntitiesGroupingQuery, indexPattern: string) => {
  return {
    ...query,
    index: indexPattern,
    project_routing: ESQL_PROJECT_ROUTING,
    ignore_unavailable: true,
    size: 0,
  };
};

const useEntitySearchParams = () => {
  const {
    data: { search: searchService },
    notifications: { toasts },
  } = useKibana().services;

  const { dataView } = useContext(DataViewContext);

  const indexPattern = useMemo(() => dataView?.getIndexPattern(), [dataView]);

  return { searchService, toasts, indexPattern };
};

export const useFetchGroupedData = ({
  query,
  enabled = true,
}: {
  query: EntitiesGroupingQuery;
  enabled: boolean;
}) => {
  const { searchService, toasts, indexPattern } = useEntitySearchParams();

  return useQuery(
    [QUERY_KEY_ENTITY_ANALYTICS, QUERY_KEY_GROUPING_DATA, { query }],
    async () => {
      const {
        rawResponse: { aggregations },
      } = await lastValueFrom(
        searchService.search<
          {},
          IKibanaSearchResponse<SearchResponse<{}, EntitiesRootGroupingAggregation>>
        >({
          params: getGroupedEntitiesQuery(query, indexPattern),
        })
      );

      // A successful search against a missing/empty index (e.g. the entity store has been
      // cleared or was never installed) comes back with no `aggregations`. Treat that as
      // "no groups" so the grouped view degrades to the empty state — matching the
      // non-grouped table — instead of throwing, which surfaced an error toast and left the
      // group list stuck in its loading placeholder.
      return aggregations ?? {};
    },
    {
      onError: (err: Error) => showErrorToast(toasts, err),
      enabled: enabled && !!indexPattern,
      keepPreviousData: true,
      refetchOnWindowFocus: false,
    }
  );
};

/** ES|QL LIMIT is capped at 10000 */
export const ESQL_LIMIT_CAP = 10_000;

/** Normalizes `hits.total`, which ES returns as either a bare number or `{ value }`. */
const getTotalHits = (hits: SearchResponse['hits'] | undefined): number => {
  const total = hits?.total;
  return typeof total === 'number' ? total : total?.value ?? 0;
};

export interface ResolutionGroupBucket {
  // single-element array to match the @kbn/grouping bucket key shape (one grouping level).
  key: [string];
  key_as_string: string;
  selectedGroup: string;
  doc_count: number;
  resolutionRiskScore: { value: number | null };
}

export interface ResolutionGroupData {
  groupByFields: { buckets: ResolutionGroupBucket[] };
  groupsCount: { value: number };
  unitsCount: { value: number };
}

export interface ResolutionFetchResult {
  groupData: ResolutionGroupData;
  targetMetadata: TargetMetadataMap;
}

interface UnfilteredResolutionTargetRow extends Record<string, unknown> {
  'entity.id': string | null;
  'entity.name': string | null;
  'entity.EngineMetadata.Type': string | null;
  // Used only to sort the top-N.
  effective_risk: number | null;
  'entity.risk.calculated_score_norm': number | null;
  'entity.relationships.resolution.risk.calculated_score_norm': number | null;
}

interface FilteredResolutionGroupRow extends Record<string, unknown> {
  group_key: string | null;
  group_risk: number | null;
  group_size: number | null;
}

interface AliasCountAggregation {
  aliases_by_target: {
    buckets: Array<{ key: string; doc_count: number }>;
  };
}

const typeList = ALLOWED_ENTITY_TYPES.map((t) => `"${t}"`).join(',');

const buildTopNTargetsEsql = (indexPattern: string, limit: number): string =>
  `FROM ${indexPattern}
| WHERE ${ENTITY_FIELDS.ENTITY_TYPE} IN (${typeList}) AND ${ENTITY_FIELDS.RESOLVED_TO} IS NULL
| EVAL effective_risk = COALESCE(${ENTITY_FIELDS.RESOLUTION_RISK_SCORE}, ${ENTITY_FIELDS.ENTITY_RISK})
| SORT effective_risk DESC NULLS LAST, ${ENTITY_FIELDS.ENTITY_ID} ASC
| LIMIT ${limit}
| KEEP ${ENTITY_FIELDS.ENTITY_ID}, ${ENTITY_FIELDS.ENTITY_NAME}, ${ENTITY_FIELDS.ENTITY_TYPE}, effective_risk, ${ENTITY_FIELDS.ENTITY_RISK}, ${ENTITY_FIELDS.RESOLUTION_RISK_SCORE}`;

const buildStatsJoinEsql = (indexPattern: string, limit: number): string =>
  `FROM ${indexPattern}
| WHERE ${ENTITY_FIELDS.ENTITY_TYPE} IN (${typeList})
| EVAL group_key = COALESCE(${ENTITY_FIELDS.RESOLVED_TO}, ${ENTITY_FIELDS.ENTITY_ID})
| STATS group_risk = MAX(COALESCE(${ENTITY_FIELDS.RESOLUTION_RISK_SCORE}, ${ENTITY_FIELDS.ENTITY_RISK})) WHERE ${ENTITY_FIELDS.RESOLVED_TO} IS NULL, group_size = COUNT(*) BY group_key
| SORT group_risk DESC NULLS LAST, group_size DESC, group_key ASC
| LIMIT ${limit}`;

/**
 * Without a full count, pagination is limited to what the growing LIMIT window has fetched.
 */
const buildGroupCountEsql = (indexPattern: string): string =>
  `FROM ${indexPattern}
| WHERE ${ENTITY_FIELDS.ENTITY_TYPE} IN (${typeList})
| EVAL group_key = COALESCE(${ENTITY_FIELDS.RESOLVED_TO}, ${ENTITY_FIELDS.ENTITY_ID})
| STATS by_group = COUNT(*) BY group_key
| STATS total = COUNT(*)`;

const buildTargetMetadataFromUnfilteredRows = (
  rows: UnfilteredResolutionTargetRow[]
): TargetMetadataMap => {
  const result: TargetMetadataMap = new Map();
  for (const row of rows) {
    const id = row[ENTITY_FIELDS.ENTITY_ID];
    const name = row[ENTITY_FIELDS.ENTITY_NAME];
    const type = row[ENTITY_FIELDS.ENTITY_TYPE] as EntityType | null;
    const riskScore = row[ENTITY_FIELDS.RESOLUTION_RISK_SCORE] ?? null;
    const individualRiskScore = row[ENTITY_FIELDS.ENTITY_RISK] ?? null;
    if (id && name && type) {
      result.set(id, { name, type, riskScore, individualRiskScore });
    }
  }
  return result;
};

/**
 * Fetches unfiltered resolution groups via an ES|QL top-N over targets. The top-N pre-sort
 * cannot account for filtered-out alias members, so this query is valid only without user filters.
 */
export const useFetchUnfilteredResolutionGroupData = ({
  pageIndex,
  pageSize,
  enabled = true,
}: {
  pageIndex: number;
  pageSize: number;
  enabled?: boolean;
}) => {
  const {
    data: { search: searchService },
    notifications: { toasts },
  } = useKibana().services;

  const { dataView } = useContext(DataViewContext);
  const indexPattern = useMemo(() => dataView?.getIndexPattern(), [dataView]);

  const limit = Math.min((pageIndex + 1) * pageSize, ESQL_LIMIT_CAP);

  return useQuery(
    [
      QUERY_KEY_ENTITY_ANALYTICS,
      QUERY_KEY_UNFILTERED_RESOLUTION_GROUPS,
      { pageIndex, pageSize, indexPattern },
    ],
    async (): Promise<ResolutionFetchResult> => {
      if (!indexPattern) throw new Error('No index pattern available');
      const esqlQuery = buildTopNTargetsEsql(indexPattern, limit);

      const [esqlResult, groupsCountResult, unitsCountResult] = await Promise.all([
        getESQLResults({
          esqlQuery,
          search: searchService.search,
          projectRouting: ESQL_PROJECT_ROUTING,
        }),
        // Group count: targets only (each target is one resolution group).
        lastValueFrom(
          searchService.search<{}, IKibanaSearchResponse<SearchResponse>>({
            params: {
              index: indexPattern,
              project_routing: ESQL_PROJECT_ROUTING,
              ignore_unavailable: true,
              size: 0,
              track_total_hits: true,
              query: {
                bool: {
                  filter: [ENTITY_TYPE_TERMS_CLAUSE],
                  must_not: [{ exists: { field: ENTITY_FIELDS.RESOLVED_TO } }],
                },
              },
            },
          })
        ),
        // Unit count: all entities (targets + aliases) for the "N entities" label.
        lastValueFrom(
          searchService.search<{}, IKibanaSearchResponse<SearchResponse>>({
            params: {
              index: indexPattern,
              project_routing: ESQL_PROJECT_ROUTING,
              ignore_unavailable: true,
              size: 0,
              track_total_hits: true,
              query: {
                bool: {
                  filter: [ENTITY_TYPE_TERMS_CLAUSE],
                },
              },
            },
          })
        ),
      ]);

      const allRows = esqlResponseToRecords<UnfilteredResolutionTargetRow>(esqlResult.response);
      const pageRows = allRows.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
      const pageTargetIds = pageRows
        .map((r) => r[ENTITY_FIELDS.ENTITY_ID])
        .filter((id): id is string => id !== null);

      const aliasCountResult = await lastValueFrom(
        searchService.search<{}, IKibanaSearchResponse<SearchResponse<{}, AliasCountAggregation>>>({
          params: {
            index: indexPattern,
            project_routing: ESQL_PROJECT_ROUTING,
            ignore_unavailable: true,
            size: 0,
            aggs: {
              aliases_by_target: {
                terms: {
                  field: ENTITY_FIELDS.RESOLVED_TO,
                  include: pageTargetIds,
                  size: pageSize,
                },
              },
            },
          },
        })
      );

      const aliasCounts = new Map<string, number>(
        (aliasCountResult.rawResponse.aggregations?.aliases_by_target?.buckets ?? []).map(
          (b) => [b.key, b.doc_count] as [string, number]
        )
      );

      const targetMetadata = buildTargetMetadataFromUnfilteredRows(pageRows);

      const buckets: ResolutionGroupBucket[] = pageRows
        .filter(
          (r): r is UnfilteredResolutionTargetRow & { 'entity.id': string } =>
            r[ENTITY_FIELDS.ENTITY_ID] !== null
        )
        .map((r) => {
          const id = r[ENTITY_FIELDS.ENTITY_ID];
          const aliasCount = aliasCounts.get(id) ?? 0;
          return {
            key: [id],
            key_as_string: id,
            selectedGroup: ENTITY_GROUPING_OPTIONS.RESOLUTION,
            doc_count: 1 + aliasCount,
            resolutionRiskScore: { value: r[ENTITY_FIELDS.RESOLUTION_RISK_SCORE] ?? null },
          };
        });

      const totalGroups = getTotalHits(groupsCountResult.rawResponse.hits);
      const totalUnits = getTotalHits(unitsCountResult.rawResponse.hits);

      return {
        groupData: {
          groupByFields: { buckets },
          groupsCount: { value: totalGroups },
          unitsCount: { value: totalUnits },
        },
        targetMetadata,
      };
    },
    {
      onError: (err: Error) => showErrorToast(toasts, err),
      enabled: enabled && !!indexPattern,
      keepPreviousData: true,
      refetchOnWindowFocus: false,
    }
  );
};

/**
 * Fetches filtered resolution groups via an ES|QL STATS join so a matching alias still surfaces
 * its target's group, which the unfiltered top-N query cannot express.
 */
export const useFetchFilteredResolutionGroupData = ({
  pageIndex,
  pageSize,
  filter,
  enabled = true,
}: {
  pageIndex: number;
  pageSize: number;
  filter?: ESBoolQuery;
  enabled?: boolean;
}) => {
  const {
    data: { search: searchService },
    notifications: { toasts },
  } = useKibana().services;

  const { dataView } = useContext(DataViewContext);
  const indexPattern = useMemo(() => dataView?.getIndexPattern(), [dataView]);

  const limit = Math.min((pageIndex + 1) * pageSize, ESQL_LIMIT_CAP);

  return useQuery(
    [
      QUERY_KEY_ENTITY_ANALYTICS,
      QUERY_KEY_FILTERED_RESOLUTION_GROUPS,
      { pageIndex, pageSize, filter, indexPattern },
    ],
    async (): Promise<ResolutionFetchResult> => {
      if (!indexPattern) throw new Error('No index pattern available');
      const esqlQuery = buildStatsJoinEsql(indexPattern, limit);

      const [esqlResult, groupCountResult, totalCountResult] = await Promise.all([
        getESQLResults({
          esqlQuery,
          search: searchService.search,
          filter,
          projectRouting: ESQL_PROJECT_ROUTING,
        }),
        // Distinct-group count over the filtered set → drives pagination (see buildGroupCountEsql).
        getESQLResults({
          esqlQuery: buildGroupCountEsql(indexPattern),
          search: searchService.search,
          filter,
          projectRouting: ESQL_PROJECT_ROUTING,
        }),
        // Unit count: all entities matching the filter for the "N entities" label.
        lastValueFrom(
          searchService.search<{}, IKibanaSearchResponse<SearchResponse>>({
            params: {
              index: indexPattern,
              project_routing: ESQL_PROJECT_ROUTING,
              ignore_unavailable: true,
              size: 0,
              track_total_hits: true,
              query: {
                bool: {
                  filter: [ENTITY_TYPE_TERMS_CLAUSE, ...(filter ? [filter] : [])],
                },
              },
            },
          })
        ),
      ]);

      const allRows = esqlResponseToRecords<FilteredResolutionGroupRow>(esqlResult.response);
      const pageRows = allRows.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
      const pageGroupKeys = pageRows.map((r) => r.group_key).filter((k): k is string => k !== null);

      const metadataResult = await lastValueFrom(
        searchService.search<{}, IKibanaSearchResponse<SearchResponse>>({
          params: {
            index: indexPattern,
            project_routing: ESQL_PROJECT_ROUTING,
            ignore_unavailable: true,
            size: pageGroupKeys.length,
            _source: [
              ENTITY_FIELDS.ENTITY_ID,
              ENTITY_FIELDS.ENTITY_NAME,
              ENTITY_FIELDS.ENTITY_TYPE,
              ENTITY_FIELDS.ENTITY_RISK,
              ENTITY_FIELDS.RESOLUTION_RISK_SCORE,
            ],
            query: {
              bool: {
                filter: [{ terms: { [ENTITY_FIELDS.ENTITY_ID]: pageGroupKeys } }],
                must_not: [{ exists: { field: ENTITY_FIELDS.RESOLVED_TO } }],
              },
            },
          },
        })
      );

      const targetMetadata = parseTargetMetadataHits(metadataResult.rawResponse.hits.hits);

      const buckets: ResolutionGroupBucket[] = pageRows
        .filter(
          (r): r is FilteredResolutionGroupRow & { group_key: string } => r.group_key !== null
        )
        .map((r) => {
          const metadata = targetMetadata.get(r.group_key);
          return {
            key: [r.group_key],
            key_as_string: r.group_key,
            selectedGroup: ENTITY_GROUPING_OPTIONS.RESOLUTION,
            doc_count: r.group_size ?? 0,
            resolutionRiskScore: { value: metadata?.riskScore ?? r.group_risk ?? null },
          };
        });

      const [groupCountRow] = esqlResponseToRecords<{ total: number | null }>(
        groupCountResult.response
      );
      const totalGroups = Number(groupCountRow?.total ?? 0);
      const totalUnits = getTotalHits(totalCountResult.rawResponse.hits);

      return {
        groupData: {
          groupByFields: { buckets },
          groupsCount: { value: totalGroups },
          unitsCount: { value: totalUnits },
        },
        targetMetadata,
      };
    },
    {
      onError: (err: Error) => showErrorToast(toasts, err),
      enabled: enabled && !!indexPattern,
      keepPreviousData: true,
      refetchOnWindowFocus: false,
    }
  );
};
