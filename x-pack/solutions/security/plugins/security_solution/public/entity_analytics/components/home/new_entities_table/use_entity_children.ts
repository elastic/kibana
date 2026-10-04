/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useRef } from 'react';
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
  createEsqlRunner,
  esc,
} from './common';
import type { QueryArgs, Row } from './common';
import { ENRICH_FNS } from './columns/registry';

const isMapEntriesEqual = (
  prev: ReadonlyMap<string, Row[]>,
  next: ReadonlyMap<string, Row[]>
): boolean => {
  if (prev.size !== next.size) return false;
  for (const [entityId, rows] of next) {
    if (prev.get(entityId) !== rows) return false;
  }
  return true;
};

const ENTITY_CHILDREN_QUERY_KEY = 'entity-children';
const ENTITY_CHILDREN_ENRICH_QUERY_KEY = 'entity-children-enrich';
const CHILDREN_STALE_TIME_MS = 60_000;
const CHILDREN_GC_TIME_MS = 5 * 60_000;

/** Expand is structural: always the full resolution group, never re-applying table filters. */
const getEntityChildrenQueryKey = (
  entityId: string,
  timeRange: TimeRange,
  concreteEntityIndexName: string,
  keepFieldsKey: string
) =>
  [ENTITY_CHILDREN_QUERY_KEY, entityId, timeRange, concreteEntityIndexName, keepFieldsKey] as const;

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
  };

  return enrichEntityRows(
    rows,
    args,
    new Set<string>([GROUP_SIZE_FIELD]),
    { runQuery, http, signal },
    ENRICH_FNS
  );
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
          }
        : null,
    [concreteEntityIndexName, timeRange, spaceId, searchService, http, keepFields]
  );

  const shellQueries = useQueries({
    queries: expandedIdList.map((entityId) => ({
      queryKey: getEntityChildrenQueryKey(
        entityId,
        timeRange,
        concreteEntityIndexName ?? '',
        keepFieldsKey
      ),
      queryFn: ({ signal }) => {
        if (!fetchParams) throw new Error('entity store index not resolved');
        return fetchEntityChildrenShell({ ...fetchParams, entityId, signal });
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
        concreteEntityIndexName ?? '',
        keepFieldsKey
      );
      return {
        queryKey: [
          ENTITY_CHILDREN_ENRICH_QUERY_KEY,
          entityId,
          timeRange,
          concreteEntityIndexName ?? '',
          keepFieldsKey,
          shell?.dataUpdatedAt ?? 0,
        ],
        queryFn: ({ signal }) => {
          if (!fetchParams) throw new Error('entity store index not resolved');
          const rows = queryClient.getQueryData<Row[]>(shellKey) ?? shell?.data;
          if (!rows) return [];
          return enrichEntityChildren(rows, { ...fetchParams, entityId, signal });
        },
        enabled: !!fetchParams && shell?.isSuccess === true,
        staleTime: CHILDREN_STALE_TIME_MS,
        gcTime: CHILDREN_GC_TIME_MS,
        retry: false,
      };
    }),
  });

  // useQueries returns a new array every render; keep the Map stable unless row data actually changes.
  const childMapRef = useRef(new Map<string, Row[]>());
  const nextChildMap = new Map<string, Row[]>();
  expandedIdList.forEach((entityId, i) => {
    const rows = enrichQueries[i]?.data ?? shellQueries[i]?.data;
    if (rows) nextChildMap.set(entityId, rows);
  });
  const prevChildMap = childMapRef.current;
  if (!isMapEntriesEqual(prevChildMap, nextChildMap)) {
    childMapRef.current = nextChildMap;
  }
  const childMap = childMapRef.current;

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
          fetchParams.concreteEntityIndexName,
          keepFieldsKey
        ),
        queryFn: ({ signal }) => fetchEntityChildrenShell({ ...fetchParams, entityId, signal }),
        staleTime: CHILDREN_STALE_TIME_MS,
      });
    },
    [fetchParams, queryClient, timeRange, keepFieldsKey]
  );

  const resetChildren = useCallback(() => {
    void queryClient.removeQueries({ queryKey: [ENTITY_CHILDREN_QUERY_KEY] });
    void queryClient.removeQueries({ queryKey: [ENTITY_CHILDREN_ENRICH_QUERY_KEY] });
  }, [queryClient]);

  return { childMap, isChildFetching, prefetchChildren, resetChildren };
};
