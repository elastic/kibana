/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { lastValueFrom } from 'rxjs';
import { useQueries, useQueryClient } from '@kbn/react-query';
import type { HttpSetup } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { useKibana } from '../../../../common/lib/kibana';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import { useResolvedLatestEntitiesIndexName } from '../../../../common/hooks/use_resolved_latest_entities_index_name';
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
  esqlResponseToRows,
  esc,
} from './common';
import type { QueryArgs, EsqlRunner, Row } from './common';
import { ENRICH_FNS } from './columns/registry';

const ENTITY_CHILDREN_QUERY_KEY = 'entity-children';
const ENTITY_CHILDREN_ENRICH_QUERY_KEY = 'entity-children-enrich';
const CHILDREN_STALE_TIME_MS = 60_000;
const CHILDREN_GC_TIME_MS = 5 * 60_000;

/** Expand is structural: always the full resolution group, never re-applying table filters. */
const getEntityChildrenQueryKey = (
  entityId: string,
  timeRange: TimeRange,
  concreteEntityIndexName: string
) => [ENTITY_CHILDREN_QUERY_KEY, entityId, timeRange, concreteEntityIndexName] as const;

const buildChildQuery = (namespace: string, entityId: string): string =>
  [
    `FROM ${entityAliasOf(namespace)}`,
    `| WHERE ${ENTITY_TYPE_FILTER}`,
    `| WHERE ${ENTITY_ID_FIELD} == ${esc(entityId)} OR ${RESOLVED_TO_FIELD} == ${esc(entityId)}`,
    buildKeepClause(),
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
}

const fetchEntityChildrenShell = async ({
  entityId,
  spaceId,
  concreteEntityIndexName,
  searchService,
}: FetchEntityChildrenParams): Promise<Row[]> => {
  const runQuery: EsqlRunner = async (query) =>
    esqlResponseToRows(
      await lastValueFrom(searchService.search({ params: { query } }, { strategy: 'esql_async' }))
    );

  const rows = await runQuery(buildChildQuery(spaceId, entityId));
  for (const row of rows) row[GROUP_SIZE_FIELD] = 1;
  return rows;
};

const enrichEntityChildren = async (
  rows: Row[],
  { timeRange, spaceId, concreteEntityIndexName, searchService, http }: FetchEntityChildrenParams
): Promise<Row[]> => {
  const runQuery: EsqlRunner = async (query) =>
    esqlResponseToRows(
      await lastValueFrom(searchService.search({ params: { query } }, { strategy: 'esql_async' }))
    );

  const args: QueryArgs = {
    namespace: spaceId,
    timeRange,
    sort: { field: RISK_SCORE_NORM_FIELD, direction: 'desc' },
    cursor: null,
    pageSize: 100,
    rowsMode: 'individual',
    concreteEntityIndexName,
  };

  return enrichEntityRows(
    rows,
    args,
    new Set<string>([GROUP_SIZE_FIELD]),
    { runQuery, http },
    ENRICH_FNS
  );
};

export interface UseEntityChildrenOptions {
  expandedIds: ReadonlySet<string>;
  timeRange: TimeRange;
}

export const useEntityChildren = ({ expandedIds, timeRange }: UseEntityChildrenOptions) => {
  const queryClient = useQueryClient();
  const {
    data: { search: searchService },
    http,
  } = useKibana().services;

  const spaceId = useSpaceId() ?? 'default';
  const { data: resolvedIndex } = useResolvedLatestEntitiesIndexName(spaceId);
  const concreteEntityIndexName = resolvedIndex?.indexName ?? null;

  const expandedIdList = useMemo(() => [...expandedIds], [expandedIds]);

  const fetchParams = useMemo(
    () =>
      concreteEntityIndexName
        ? {
            timeRange,
            spaceId,
            concreteEntityIndexName,
            searchService,
            http,
          }
        : null,
    [concreteEntityIndexName, timeRange, spaceId, searchService, http]
  );

  const shellQueries = useQueries({
    queries: expandedIdList.map((entityId) => ({
      queryKey: getEntityChildrenQueryKey(entityId, timeRange, concreteEntityIndexName ?? ''),
      queryFn: () => {
        if (!fetchParams) throw new Error('entity store index not resolved');
        return fetchEntityChildrenShell({ ...fetchParams, entityId });
      },
      enabled: !!fetchParams,
      staleTime: CHILDREN_STALE_TIME_MS,
      gcTime: CHILDREN_GC_TIME_MS,
      retry: false,
    })),
  });

  const enrichQueries = useQueries({
    queries: expandedIdList.map((entityId, i) => {
      const shell = shellQueries[i];
      const shellKey = getEntityChildrenQueryKey(
        entityId,
        timeRange,
        concreteEntityIndexName ?? ''
      );
      return {
        queryKey: [
          ENTITY_CHILDREN_ENRICH_QUERY_KEY,
          entityId,
          timeRange,
          concreteEntityIndexName ?? '',
          shell?.dataUpdatedAt ?? 0,
        ],
        queryFn: () => {
          if (!fetchParams) throw new Error('entity store index not resolved');
          const rows = queryClient.getQueryData<Row[]>(shellKey) ?? shell?.data;
          if (!rows) return [];
          return enrichEntityChildren(rows, { ...fetchParams, entityId });
        },
        enabled: !!fetchParams && shell?.isSuccess === true,
        staleTime: CHILDREN_STALE_TIME_MS,
        gcTime: CHILDREN_GC_TIME_MS,
        retry: false,
      };
    }),
  });

  const childMap = useMemo(() => {
    const map = new Map<string, Row[]>();
    expandedIdList.forEach((entityId, i) => {
      const rows = enrichQueries[i]?.data ?? shellQueries[i]?.data;
      if (rows) map.set(entityId, rows);
    });
    return map;
  }, [expandedIdList, shellQueries, enrichQueries]);

  const fetchingIds = useMemo(() => {
    const set = new Set<string>();
    expandedIdList.forEach((entityId, i) => {
      if (shellQueries[i]?.isFetching || enrichQueries[i]?.isFetching) set.add(entityId);
    });
    return set;
  }, [expandedIdList, shellQueries, enrichQueries]);

  const isChildFetching = useCallback(
    (entityId: string) => fetchingIds.has(entityId),
    [fetchingIds]
  );

  const prefetchChildren = useCallback(
    (entityId: string) => {
      if (!fetchParams) return;
      void queryClient.prefetchQuery({
        queryKey: getEntityChildrenQueryKey(
          entityId,
          timeRange,
          fetchParams.concreteEntityIndexName
        ),
        queryFn: () => fetchEntityChildrenShell({ ...fetchParams, entityId }),
        staleTime: CHILDREN_STALE_TIME_MS,
      });
    },
    [fetchParams, queryClient, timeRange]
  );

  const resetChildren = useCallback(() => {
    void queryClient.removeQueries({ queryKey: [ENTITY_CHILDREN_QUERY_KEY] });
    void queryClient.removeQueries({ queryKey: [ENTITY_CHILDREN_ENRICH_QUERY_KEY] });
  }, [queryClient]);

  return { childMap, isChildFetching, prefetchChildren, resetChildren };
};
