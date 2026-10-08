/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useQueries, useQueryClient, type QueryFunctionContext } from '@kbn/react-query';
import type { HttpSetup } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { useKibana } from '../../../../common/lib/kibana';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import { useResolvedLatestEntitiesIndexName } from '../../../../common/hooks/use_resolved_latest_entities_index_name';
import { useInstalledSecurityJobsIds } from '../../../../common/components/ml/hooks/use_installed_security_jobs';
import type { TimeRange } from './use_entity_analytics_url_state';
import {
  entityAliasOf,
  ENTITY_TYPE_FILTER,
  ENTITY_ID_FIELD,
  GROUP_SIZE_FIELD,
  RESOLVED_TO_FIELD,
  RISK_SCORE_NORM_FIELD,
  buildKeepClause,
  enrichEntityRows,
  createEsqlRunner,
  esc,
} from './common';
import type { QueryArgs, Row } from './common';
import { PAGE_ENRICHERS } from './grid_columns';

/** `[entityId, shell dataUpdatedAt, enrich dataUpdatedAt]` of one expanded entity. */
type ChildDataVersion = [string, number, number];

const ENTITY_CHILDREN_QUERY_KEY = 'entity-children';
const ENTITY_CHILDREN_ENRICH_QUERY_KEY = 'entity-children-enrich';
const CHILDREN_STALE_TIME_MS = 60_000;
const CHILDREN_CACHE_TIME_MS = 5 * 60_000;

/** Expand is structural: always the full resolution group, never re-applying table filters. */
const getEntityChildrenQueryKey = (
  entityId: string,
  timeRange: TimeRange,
  concreteEntityIndexName: string,
  keepFieldsKey: string
) =>
  [ENTITY_CHILDREN_QUERY_KEY, entityId, timeRange, concreteEntityIndexName, keepFieldsKey] as const;

/**
 * The enrich key repeats the shell key and the shell data time, so it refetches on new shell
 * data, and the anomaly jobs the anomaly counts read.
 */
const getEntityChildrenEnrichQueryKey = (
  shellKey: ReturnType<typeof getEntityChildrenQueryKey>,
  shellUpdatedAt: number,
  anomalyJobIdsKey: string
) =>
  [
    ENTITY_CHILDREN_ENRICH_QUERY_KEY,
    ...shellKey.slice(1),
    shellUpdatedAt,
    anomalyJobIdsKey,
  ] as const;

const buildChildQuery = (
  namespace: string,
  entityId: string,
  keepFields?: readonly string[]
): string =>
  [
    `FROM ${entityAliasOf(namespace)}`,
    `| WHERE ${ENTITY_TYPE_FILTER}`,
    `| WHERE ${ENTITY_ID_FIELD} == ${esc(entityId)} OR ${RESOLVED_TO_FIELD} == ${esc(entityId)}`,
    buildKeepClause({ keepFields }),
    `| SORT ${RISK_SCORE_NORM_FIELD} DESC NULLS LAST, ${ENTITY_ID_FIELD} ASC`,
    `| LIMIT 100`,
  ].join('\n');

interface FetchEntityChildrenParams {
  entityId: string;
  timeRange: TimeRange;
  spaceId: string;
  concreteEntityIndexName: string;
  searchService: DataPublicPluginStart['search'];
  http: HttpSetup;
  keepFields?: readonly string[];
  anomalyJobIds: readonly string[];
  signal?: AbortSignal;
}

const fetchEntityChildrenShell = async ({
  entityId,
  spaceId,
  searchService,
  keepFields,
  signal,
}: FetchEntityChildrenParams): Promise<Row[]> => {
  const runQuery = createEsqlRunner(searchService, signal);

  const rows = await runQuery(buildChildQuery(spaceId, entityId, keepFields));
  for (const row of rows) row[GROUP_SIZE_FIELD] = 1;
  return rows;
};

const enrichEntityChildren = async (
  rows: Row[],
  {
    timeRange,
    spaceId,
    concreteEntityIndexName,
    anomalyJobIds,
    searchService,
    http,
    signal,
  }: FetchEntityChildrenParams
): Promise<Row[]> => {
  const runQuery = createEsqlRunner(searchService, signal);

  const args: QueryArgs = {
    namespace: spaceId,
    timeRange,
    sort: { field: RISK_SCORE_NORM_FIELD, direction: 'desc' },
    cursor: null,
    pageSize: 100,
    rowsMode: 'individual',
    concreteEntityIndexName,
    anomalyJobIds,
  };

  return enrichEntityRows(rows, args, { runQuery, http, signal }, PAGE_ENRICHERS.child);
};

export interface UseEntityChildrenOptions {
  expandedIds: ReadonlySet<string>;
  timeRange: TimeRange;
  keepFields?: readonly string[];
}

export const useEntityChildren = ({
  expandedIds,
  timeRange,
  keepFields,
}: UseEntityChildrenOptions) => {
  const queryClient = useQueryClient();
  const {
    data: { search: searchService },
    http,
  } = useKibana().services;

  const spaceId = useSpaceId() ?? 'default';
  const { data: resolvedIndex } = useResolvedLatestEntitiesIndexName(spaceId);
  const concreteEntityIndexName = resolvedIndex?.indexName ?? null;
  const { jobIds: anomalyJobIds, loading: isAnomalyJobsLoading } = useInstalledSecurityJobsIds();
  const anomalyJobIdsKey = anomalyJobIds.join('\0');

  const expandedIdList = useMemo(() => [...expandedIds], [expandedIds]);

  const keepFieldsKey = (keepFields ?? []).join('\0');

  const fetchParams = useMemo(
    () =>
      concreteEntityIndexName
        ? {
            timeRange,
            spaceId,
            concreteEntityIndexName,
            searchService,
            http,
            keepFields,
            anomalyJobIds,
          }
        : null,
    [concreteEntityIndexName, timeRange, spaceId, searchService, http, keepFields, anomalyJobIds]
  );

  const shellQueries = useQueries({
    queries: expandedIdList.map((entityId) => ({
      queryKey: getEntityChildrenQueryKey(
        entityId,
        timeRange,
        concreteEntityIndexName ?? '',
        keepFieldsKey
      ),
      queryFn: ({ signal }: QueryFunctionContext) => {
        if (!fetchParams) throw new Error('entity store index not resolved');
        return fetchEntityChildrenShell({ ...fetchParams, entityId, signal });
      },
      enabled: !!fetchParams,
      staleTime: CHILDREN_STALE_TIME_MS,
      cacheTime: CHILDREN_CACHE_TIME_MS,
      retry: false,
    })),
  });

  const enrichQueries = useQueries({
    queries: expandedIdList.map((entityId, i) => {
      const shell = shellQueries[i];
      const shellKey = getEntityChildrenQueryKey(
        entityId,
        timeRange,
        concreteEntityIndexName ?? '',
        keepFieldsKey
      );
      return {
        queryKey: getEntityChildrenEnrichQueryKey(
          shellKey,
          shell?.dataUpdatedAt ?? 0,
          anomalyJobIdsKey
        ),
        queryFn: ({ signal }: QueryFunctionContext) => {
          if (!fetchParams) throw new Error('entity store index not resolved');
          const rows = queryClient.getQueryData<Row[]>(shellKey) ?? shell?.data;
          if (!rows) return [];
          return enrichEntityChildren(rows, { ...fetchParams, entityId, signal });
        },
        enabled: !!fetchParams && shell?.isSuccess === true && !isAnomalyJobsLoading,
        staleTime: CHILDREN_STALE_TIME_MS,
        cacheTime: CHILDREN_CACHE_TIME_MS,
        retry: false,
      };
    }),
  });

  // useQueries returns new arrays every render. This key changes only when child data
  // changes, so the Map below (and the grid context that holds it) stays stable.
  const childDataKey = JSON.stringify(
    expandedIdList.map(
      (entityId, i): ChildDataVersion => [
        entityId,
        shellQueries[i]?.dataUpdatedAt ?? 0,
        enrichQueries[i]?.dataUpdatedAt ?? 0,
      ]
    )
  );

  const childMap = useMemo(() => {
    const map = new Map<string, Row[]>();
    const versions: ChildDataVersion[] = JSON.parse(childDataKey);
    for (const [entityId, shellUpdatedAt] of versions) {
      const shellKey = getEntityChildrenQueryKey(
        entityId,
        timeRange,
        concreteEntityIndexName ?? '',
        keepFieldsKey
      );
      const rows =
        queryClient.getQueryData<Row[]>(
          getEntityChildrenEnrichQueryKey(shellKey, shellUpdatedAt, anomalyJobIdsKey)
        ) ?? queryClient.getQueryData<Row[]>(shellKey);
      if (rows) map.set(entityId, rows);
    }
    return map;
  }, [
    childDataKey,
    queryClient,
    timeRange,
    concreteEntityIndexName,
    keepFieldsKey,
    anomalyJobIdsKey,
  ]);

  const isAnyChildFetching = [...shellQueries, ...enrichQueries].some((q) => q.isFetching);

  const prefetchChildren = useCallback(
    (entityId: string) => {
      if (!fetchParams) return;
      void queryClient.prefetchQuery({
        queryKey: getEntityChildrenQueryKey(
          entityId,
          timeRange,
          fetchParams.concreteEntityIndexName,
          keepFieldsKey
        ),
        queryFn: ({ signal }: QueryFunctionContext) =>
          fetchEntityChildrenShell({ ...fetchParams, entityId, signal }),
        staleTime: CHILDREN_STALE_TIME_MS,
      });
    },
    [fetchParams, queryClient, timeRange, keepFieldsKey]
  );

  const resetChildren = useCallback(() => {
    void queryClient.removeQueries({ queryKey: [ENTITY_CHILDREN_QUERY_KEY] });
    void queryClient.removeQueries({ queryKey: [ENTITY_CHILDREN_ENRICH_QUERY_KEY] });
  }, [queryClient]);

  return { childMap, isAnyChildFetching, prefetchChildren, resetChildren };
};
