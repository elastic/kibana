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
import { useKibana } from '../../../../../common/lib/kibana';
import {
  ALLOWED_ENTITY_TYPES,
  ENTITY_FIELDS,
  ENTITY_GROUPING_OPTIONS,
  QUERY_KEY_GROUPING_DATA,
  QUERY_KEY_ENTITY_ANALYTICS,
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
  bucketRiskScore?: {
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

const EMPTY_TARGET_METADATA: TargetMetadataMap = new Map();

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
    project_routing: '_alias:_origin',
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

      if (!aggregations) throw new Error('Failed to aggregate by, missing resource id');

      return aggregations;
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

const ESQL_PROJECT_ROUTING = '_alias:_origin' as const;
const QUERY_KEY_RESOLUTION_PATH_A = 'entity-analytics-resolution-path-a';
const QUERY_KEY_RESOLUTION_PATH_B = 'entity-analytics-resolution-path-b';

export interface ResolutionGroupBucket {
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

interface PathATargetRow extends Record<string, unknown> {
  'entity.id': string | null;
  'entity.name': string | null;
  'entity.EngineMetadata.Type': string | null;
  eff: number | null;
  'entity.risk.calculated_score_norm': number | null;
  'entity.relationships.resolution.risk.calculated_score_norm': number | null;
}

interface PathBGroupRow extends Record<string, unknown> {
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
| EVAL eff = COALESCE(${ENTITY_FIELDS.RESOLUTION_RISK_SCORE}, ${ENTITY_FIELDS.ENTITY_RISK})
| SORT eff DESC NULLS LAST
| LIMIT ${limit}
| KEEP ${ENTITY_FIELDS.ENTITY_ID}, ${ENTITY_FIELDS.ENTITY_NAME}, ${ENTITY_FIELDS.ENTITY_TYPE}, eff, ${ENTITY_FIELDS.ENTITY_RISK}, ${ENTITY_FIELDS.RESOLUTION_RISK_SCORE}`;

const buildStatsJoinEsql = (indexPattern: string, limit: number): string =>
  `FROM ${indexPattern}
| WHERE ${ENTITY_FIELDS.ENTITY_TYPE} IN (${typeList})
| EVAL group_key = COALESCE(${ENTITY_FIELDS.RESOLVED_TO}, ${ENTITY_FIELDS.ENTITY_ID})
| STATS group_risk = MAX(COALESCE(${ENTITY_FIELDS.RESOLUTION_RISK_SCORE}, ${ENTITY_FIELDS.ENTITY_RISK})) WHERE ${ENTITY_FIELDS.RESOLVED_TO} IS NULL, group_size = COUNT(*) BY group_key
| SORT group_risk DESC NULLS LAST, group_size DESC
| LIMIT ${limit}`;

const buildTargetMetadataFromPathARows = (rows: PathATargetRow[]): TargetMetadataMap => {
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
 * Path A: unfiltered resolution grouping via ES|QL top-N.
 * Three queries: top-N targets ES|QL + bounded alias count DSL + total target count DSL.
 */
export const useFetchResolutionGroupDataPathA = ({
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
      QUERY_KEY_RESOLUTION_PATH_A,
      { pageIndex, pageSize, indexPattern },
    ],
    async (): Promise<ResolutionFetchResult> => {
      if (!indexPattern) throw new Error('No index pattern available');
      const esqlQuery = buildTopNTargetsEsql(indexPattern, limit);

      const [esqlResult, groupsCountResult] = await Promise.all([
        getESQLResults({
          esqlQuery,
          search: searchService.search,
          projectRouting: ESQL_PROJECT_ROUTING,
        }),
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
                  filter: [{ terms: { [ENTITY_FIELDS.ENTITY_TYPE]: [...ALLOWED_ENTITY_TYPES] } }],
                  must_not: [{ exists: { field: ENTITY_FIELDS.RESOLVED_TO } }],
                },
              },
            },
          })
        ),
      ]);

      const allRows = esqlResponseToRecords<PathATargetRow>(esqlResult.response);
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

      const targetMetadata = buildTargetMetadataFromPathARows(pageRows);

      const buckets: ResolutionGroupBucket[] = pageRows
        .filter(
          (r): r is PathATargetRow & { 'entity.id': string } => r[ENTITY_FIELDS.ENTITY_ID] !== null
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

      const rawTotal = groupsCountResult.rawResponse.hits?.total;
      const totalGroups = typeof rawTotal === 'number' ? rawTotal : rawTotal?.value ?? 0;

      return {
        groupData: {
          groupByFields: { buckets },
          groupsCount: { value: totalGroups },
          unitsCount: { value: totalGroups },
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
 * Path B: filtered resolution grouping via ES|QL STATS join.
 * Three queries: STATS join ES|QL (with user filters) + mandatory metadata fixup DSL + total entity count DSL.
 */
export const useFetchResolutionGroupDataPathB = ({
  pageIndex,
  pageSize,
  filter,
  enabled = true,
}: {
  pageIndex: number;
  pageSize: number;
  filter?: unknown;
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
      QUERY_KEY_RESOLUTION_PATH_B,
      { pageIndex, pageSize, filter, indexPattern },
    ],
    async (): Promise<ResolutionFetchResult> => {
      if (!indexPattern) throw new Error('No index pattern available');
      const esqlQuery = buildStatsJoinEsql(indexPattern, limit);

      const [esqlResult, totalCountResult] = await Promise.all([
        getESQLResults({
          esqlQuery,
          search: searchService.search,
          filter,
          projectRouting: ESQL_PROJECT_ROUTING,
        }),
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
                  filter: [
                    { terms: { [ENTITY_FIELDS.ENTITY_TYPE]: [...ALLOWED_ENTITY_TYPES] } },
                    ...(filter ? [filter] : []),
                  ],
                },
              },
            },
          })
        ),
      ]);

      const allRows = esqlResponseToRecords<PathBGroupRow>(esqlResult.response);
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
        .filter((r): r is PathBGroupRow & { group_key: string } => r.group_key !== null)
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

      const rawTotal = totalCountResult.rawResponse.hits?.total;
      const totalUnits = typeof rawTotal === 'number' ? rawTotal : rawTotal?.value ?? 0;

      return {
        groupData: {
          groupByFields: { buckets },
          groupsCount: { value: buckets.length },
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

const QUERY_KEY_TARGET_METADATA = 'entity-analytics-resolution-target-metadata';

export const useFetchTargetMetadata = (entityIds: string[]): TargetMetadataMap => {
  const { searchService, toasts, indexPattern } = useEntitySearchParams();

  const { data: metadataMap } = useQuery(
    [QUERY_KEY_ENTITY_ANALYTICS, QUERY_KEY_TARGET_METADATA, entityIds],
    async () => {
      const {
        rawResponse: { hits },
      } = await lastValueFrom(
        searchService.search<{}, IKibanaSearchResponse<SearchResponse>>({
          params: {
            index: indexPattern,
            project_routing: '_alias:_origin',
            ignore_unavailable: true,
            size: entityIds.length,
            _source: [
              ENTITY_FIELDS.ENTITY_ID,
              ENTITY_FIELDS.ENTITY_NAME,
              ENTITY_FIELDS.ENTITY_TYPE,
              ENTITY_FIELDS.ENTITY_RISK,
              ENTITY_FIELDS.RESOLUTION_RISK_SCORE,
            ],
            query: {
              bool: {
                filter: [{ terms: { [ENTITY_FIELDS.ENTITY_ID]: entityIds } }],
                must_not: [{ exists: { field: ENTITY_FIELDS.RESOLVED_TO } }],
              },
            },
          },
        })
      );

      return parseTargetMetadataHits(hits.hits);
    },
    {
      onError: (err: Error) => showErrorToast(toasts, err),
      enabled: entityIds.length > 0 && !!indexPattern,
      keepPreviousData: true,
      refetchOnWindowFocus: false,
    }
  );

  return metadataMap ?? EMPTY_TARGET_METADATA;
};
