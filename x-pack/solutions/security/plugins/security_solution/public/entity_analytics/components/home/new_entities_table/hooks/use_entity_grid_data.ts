/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@kbn/react-query';
import type { QueryClient } from '@kbn/react-query';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../../../common/lib/kibana';
import { useSpaceId } from '../../../../../common/hooks/use_space_id';
import { useErrorToast } from '../../../../../common/hooks/use_error_toast';
import { useResolvedLatestEntitiesIndexName } from '../../../../../common/hooks/use_resolved_latest_entities_index_name';
import { useInstalledSecurityJobsIds } from '../../../../../common/components/ml/hooks/use_installed_security_jobs';
import type {
  EnrichedRows,
  TimeRange,
  RowsMode,
  EntityGridResponse,
  QueryArgs,
  Row,
  PageCursor,
  SortDir,
} from '../common';
import {
  entityIdsOf,
  getEntityId,
  getNumber,
  ANOMALY_COUNT_FIELD,
  enrichEntityRows,
  createEsqlRunner,
  nullOnFailure,
  toSortValue,
} from '../common';
import { PAGE_ENRICHERS, findSortQuerySpec } from '../grid_columns';

const ENRICH_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.entitiesGrid.enrichError',
  { defaultMessage: 'Some columns of the entities table could not be loaded' }
);

const GRID_QUERY_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.entitiesGrid.queryError',
  { defaultMessage: 'Error loading entities table' }
);

// ── query keys ────────────────────────────────────────────────────────────────

/** `page`: the grid pages. `children`: the child rows of expanded groups. */
export type EntityGridKeyScope = 'page' | 'children';

/** Prefix of every child rows query, e.g. for `useIsFetching`. */
export const ENTITY_GRID_CHILDREN_QUERY_KEY = ['entity-grid', 'children'] as const;

/** Inputs that every grid query depends on. */
interface GridQueryScope {
  sortField: string;
  searchExpression?: string;
  entityExpression?: string;
  timeRange: TimeRange;
  rowsMode: RowsMode;
  concreteEntityIndexName: string | null;
  spaceId: string;
}

/**
 * Query keys of the grid. The count is keyed by its query text: every sort except group
 * size counts the entities in view, so they share one cached total per filter set. Count
 * queries must not embed time-dependent values, or the key would change on every render.
 */
const entityGridKeys = {
  shell: (
    keyScope: EntityGridKeyScope,
    scope: GridQueryScope,
    page: {
      sortDirection: SortDir;
      pageIndex: number;
      pageSize: number;
      keepFieldsKey: string;
      anomalyJobIdsKey: string;
    }
  ) => ['entity-grid', keyScope, 'shell', { ...scope, ...page }] as const,
  count: (keyScope: EntityGridKeyScope, spaceId: string, countQuery: string | null) =>
    ['entity-grid', keyScope, 'count', { spaceId, countQuery }] as const,
  enrich: (
    keyScope: EntityGridKeyScope,
    scope: GridQueryScope,
    page: {
      sortDirection: SortDir;
      entityIdsKey: string;
      shellUpdatedAt: number;
      anomalyJobIdsKey: string;
    }
  ) => ['entity-grid', keyScope, 'enrich', { ...scope, ...page }] as const,
};

/**
 * How long a page stays fresh. A group's records rarely change while it is expanded, so a
 * prefetched child page is still fresh when the row expands, and its rows aren't read twice.
 */
const SHELL_STALE_TIME_MS: Readonly<Record<EntityGridKeyScope, number>> = {
  page: 0,
  children: 60_000,
};

// ── helpers ───────────────────────────────────────────────────────────────────

const buildNextCursor = (
  pageRows: Row[],
  args: QueryArgs,
  hasNextPage: boolean
): PageCursor | null => {
  const lastRow = pageRows[pageRows.length - 1];
  if (!hasNextPage || !lastRow) return null;

  return {
    sortField: args.sort.field,
    sortDirection: args.sort.direction,
    sortValue: toSortValue(lastRow[args.sort.field]),
    entityId: getEntityId(lastRow) ?? '',
  };
};

interface PageRowsInput {
  shellRows?: Row[];
  isShellPrevious: boolean;
  enrichedRows?: Row[];
  isEnrichPrevious: boolean;
  isEnrichFetching: boolean;
}

/**
 * Picks the rows to paint. keepPreviousData holds the last page on both queries, so
 * previous enrich data never goes onto a new shell (other entity ids). `isEnriching`
 * is true while the painted rows are a new shell and its enrich query is in flight:
 * enrich cells have no value yet, which is different from "no value".
 */
export const selectPageRows = ({
  shellRows,
  isShellPrevious,
  enrichedRows,
  isEnrichPrevious,
  isEnrichFetching,
}: PageRowsInput): { rows: Row[]; isEnriching: boolean } => {
  if (isShellPrevious) return { rows: enrichedRows ?? shellRows ?? [], isEnriching: false };
  // A background refetch of the same page keeps its entities: keep the enriched rows
  // until fresh enrich data arrives, instead of flashing skeletons.
  if (isEnrichPrevious && enrichedRows && shellRows && haveSameEntities(enrichedRows, shellRows)) {
    return { rows: enrichedRows, isEnriching: false };
  }
  if (isEnrichPrevious || enrichedRows == null) {
    return { rows: shellRows ?? [], isEnriching: shellRows != null && isEnrichFetching };
  }
  return { rows: enrichedRows, isEnriching: false };
};

const haveSameEntities = (a: readonly Row[], b: readonly Row[]): boolean =>
  a.length === b.length && a.every((row, i) => getEntityId(row) === getEntityId(b[i]));

// ── queries ───────────────────────────────────────────────────────────────────

export interface UseEntityGridDataOptions {
  sortField: string;
  sortDirection: SortDir;
  pageIndex: number;
  pageSize: number;
  searchExpression?: string;
  entityExpression?: string;
  timeRange: TimeRange;
  rowsMode?: RowsMode;
  keepFields?: readonly string[];
  keyScope?: EntityGridKeyScope;
}

/** What the grid queries read besides the options; the hook and the prefetch share it. */
interface GridQueryEnv {
  queryClient: QueryClient;
  searchService: DataPublicPluginStart['search'];
  spaceId: string;
  concreteEntityIndexName: string | null;
  anomalyJobIds: readonly string[];
}

const useGridQueryEnv = () => {
  const queryClient = useQueryClient();
  const {
    data: { search: searchService },
    http,
  } = useKibana().services;
  const spaceId = useSpaceId() ?? 'default';
  const { data: resolvedIndex } = useResolvedLatestEntitiesIndexName(spaceId);
  const concreteEntityIndexName = resolvedIndex?.indexName ?? null;
  const { jobIds: anomalyJobIds, loading: isAnomalyJobsLoading } = useInstalledSecurityJobsIds();

  const env = useMemo(
    (): GridQueryEnv => ({
      queryClient,
      searchService,
      spaceId,
      concreteEntityIndexName,
      anomalyJobIds,
    }),
    [queryClient, searchService, spaceId, concreteEntityIndexName, anomalyJobIds]
  );
  return { env, http, isAnomalyJobsLoading };
};

/** Query keys, arguments and fetchers of one grid view. */
const createGridQueries = (
  { queryClient, searchService, spaceId, concreteEntityIndexName, anomalyJobIds }: GridQueryEnv,
  {
    sortField,
    sortDirection,
    pageSize,
    searchExpression,
    entityExpression,
    timeRange,
    rowsMode = 'resolved',
    keepFields,
    keyScope = 'page',
  }: UseEntityGridDataOptions
) => {
  const anomalyJobIdsKey = anomalyJobIds.join('\0');
  const isAnomalySort = sortField === ANOMALY_COUNT_FIELD;
  const keepFieldsKey = (keepFields ?? []).join('\0');
  const sortSpec = findSortQuerySpec(sortField);

  const scope: GridQueryScope = {
    sortField,
    searchExpression,
    entityExpression,
    timeRange,
    rowsMode,
    concreteEntityIndexName,
    spaceId,
  };
  // Only the anomaly sort reads the anomaly jobs; other shells don't wait for them.
  const shellKey = (index: number) =>
    entityGridKeys.shell(keyScope, scope, {
      sortDirection,
      pageIndex: index,
      pageSize,
      keepFieldsKey,
      anomalyJobIdsKey: isAnomalySort ? anomalyJobIdsKey : '',
    });

  /** Query arguments for the resolved index; call only when the index is known. */
  const buildArgs = (indexName: string, cursor: PageCursor | null): QueryArgs => ({
    namespace: spaceId,
    timeRange,
    sort: { field: sortField, direction: sortDirection },
    cursor,
    pageSize,
    rowsMode,
    concreteEntityIndexName: indexName,
    searchExpression,
    entityExpression,
    keepFields,
    anomalyJobIds,
  });

  const countEsql =
    concreteEntityIndexName && sortSpec
      ? sortSpec.buildCountQuery(buildArgs(concreteEntityIndexName, null))
      : null;
  const countKey = entityGridKeys.count(keyScope, spaceId, countEsql);
  const fetchCount = async ({ signal }: { signal?: AbortSignal }): Promise<number> => {
    if (!countEsql) throw new Error(`Column ${sortField} is not sortable`);

    const [countRow] = await createEsqlRunner(searchService, signal)(countEsql);
    return (countRow && getNumber(countRow, 'total')) ?? 0;
  };

  /** One page of rows after `cursor`, and the cursor of the next page. */
  const fetchShell = async (
    cursor: PageCursor | null,
    signal?: AbortSignal
  ): Promise<EntityGridResponse> => {
    if (!concreteEntityIndexName) throw new Error('entity store index not resolved');
    if (!sortSpec) throw new Error(`Column ${sortField} is not sortable`);

    const args = buildArgs(concreteEntityIndexName, cursor);
    const runQuery = createEsqlRunner(searchService, signal);
    // A column that reads its page with several queries picks them by the view size,
    // from the count query that runs for the grid anyway. Without a count it keeps its
    // general sort query (view size 0).
    const allRows = sortSpec.runSortPage
      ? await sortSpec.runSortPage(args, {
          runQuery,
          viewSize:
            (await nullOnFailure(
              queryClient.fetchQuery({
                queryKey: countKey,
                queryFn: fetchCount,
                staleTime: Infinity,
              })
            )) ?? 0,
        })
      : await runQuery(sortSpec.buildSortQuery(args));
    const hasNextPage = allRows.length > pageSize;
    const pageRows = hasNextPage ? allRows.slice(0, pageSize) : allRows;

    return {
      entities: pageRows,
      next_cursor: buildNextCursor(pageRows, args, hasNextPage),
      total: null,
    };
  };

  return {
    scope,
    keyScope,
    isAnomalySort,
    anomalyJobIdsKey,
    shellKey,
    buildArgs,
    countEsql,
    countKey,
    fetchCount,
    fetchShell,
  };
};

// ── hooks ─────────────────────────────────────────────────────────────────────

export const useEntityGridData = (options: UseEntityGridDataOptions) => {
  const { sortDirection, pageIndex, pageSize, rowsMode = 'resolved' } = options;
  const { env, http, isAnomalyJobsLoading } = useGridQueryEnv();
  const { queryClient, searchService, concreteEntityIndexName } = env;
  const {
    scope,
    keyScope,
    isAnomalySort,
    anomalyJobIdsKey,
    shellKey,
    buildArgs,
    countEsql,
    countKey,
    fetchCount,
    fetchShell,
  } = createGridQueries(env, options);

  // Page N's cursor is page N-1's cached next_cursor. If the user jumps ahead,
  // fetch the first page we don't have until we reach pageIndex.
  let fetchPageIndex = pageIndex;
  for (let i = 0; i < pageIndex; i++) {
    const cached = queryClient.getQueryData<EntityGridResponse>(shellKey(i));
    if (cached == null || cached.next_cursor == null) {
      fetchPageIndex = i;
      break;
    }
  }

  const cursor =
    fetchPageIndex === 0
      ? null
      : queryClient.getQueryData<EntityGridResponse>(shellKey(fetchPageIndex - 1))?.next_cursor ??
        null;

  const shellQuery = useQuery(
    shellKey(fetchPageIndex),
    ({ signal }) => fetchShell(cursor, signal),
    {
      enabled:
        !!concreteEntityIndexName &&
        (fetchPageIndex === 0 || cursor != null) &&
        !(isAnomalySort && isAnomalyJobsLoading),
      // Keep painting the last page while the next shell key loads (page/sort/filter).
      // Count stays strict below so pagination totals don't lag behind the tile/filter.
      keepPreviousData: true,
      staleTime: SHELL_STALE_TIME_MS[keyScope],
    }
  );

  const countQuery = useQuery(countKey, fetchCount, {
    enabled: countEsql != null,
    // No keepPreviousData: a stale unfiltered total invents phantom pages after a
    // tile/filter. `total` below falls back to the painted page so rowCount does
    // not snap to 0 and collapse the grid.
  });

  const isCurrentPage = fetchPageIndex === pageIndex;
  const shellRows = isCurrentPage ? shellQuery.data?.entities : undefined;

  const enrichQuery = useQuery(
    entityGridKeys.enrich(keyScope, scope, {
      sortDirection,
      entityIdsKey: entityIdsOf(shellRows ?? []).join('\0'),
      shellUpdatedAt: shellQuery.dataUpdatedAt,
      anomalyJobIdsKey,
    }),
    async ({ signal }): Promise<EnrichedRows> => {
      if (!concreteEntityIndexName || !shellRows) return { rows: [], errors: [] };

      return enrichEntityRows(
        shellRows,
        buildArgs(concreteEntityIndexName, cursor),
        { runQuery: createEsqlRunner(searchService, signal), http, signal },
        PAGE_ENRICHERS[rowsMode]
      );
    },
    {
      enabled:
        isCurrentPage &&
        !!concreteEntityIndexName &&
        shellQuery.isSuccess &&
        !shellQuery.isPreviousData &&
        shellRows != null &&
        !isAnomalyJobsLoading,
      keepPreviousData: true,
      // Enrich data only goes stale with its shell: a shell refetch changes the key
      // (shellUpdatedAt) and runs it again. Refetching a cached enrich on mount would
      // query for the rows the shell refetch is about to replace.
      staleTime: Infinity,
    }
  );

  // Prefer shell (empties the grid), then count / enrich — one toast when several fail together.
  useErrorToast(GRID_QUERY_ERROR_TITLE, shellQuery.error ?? countQuery.error ?? enrichQuery.error);
  // Columns whose enricher failed show no value; say so, as an empty cell also means none.
  useErrorToast(ENRICH_ERROR_TITLE, enrichQuery.data?.errors[0]);

  const { rows, isEnriching } = selectPageRows({
    shellRows,
    isShellPrevious: shellQuery.isPreviousData,
    enrichedRows: enrichQuery.data?.rows,
    isEnrichPrevious: enrichQuery.isPreviousData,
    isEnrichFetching: enrichQuery.isFetching,
  });
  const total = countQuery.data ?? (rows.length > 0 ? pageIndex * pageSize + rows.length : 0);
  const updatedAt = Math.max(shellQuery.dataUpdatedAt, enrichQuery.dataUpdatedAt) || null;

  return {
    rows,
    isEnriching,
    total,
    updatedAt,
    isFetching:
      !isCurrentPage ||
      shellQuery.isFetching ||
      enrichQuery.isFetching ||
      countQuery.isFetching ||
      !concreteEntityIndexName,
    isLastPage: isCurrentPage && shellQuery.data != null && shellQuery.data.next_cursor == null,
  };
};

/** Fetches the first page of a grid view ahead of time, e.g. a group's records on hover. */
export const usePrefetchEntityGridPage = (): ((options: UseEntityGridDataOptions) => void) => {
  const { env } = useGridQueryEnv();
  return useCallback(
    (options: UseEntityGridDataOptions) => {
      if (!env.concreteEntityIndexName) return;
      const { keyScope, shellKey, fetchShell } = createGridQueries(env, options);
      void env.queryClient.prefetchQuery({
        queryKey: shellKey(0),
        queryFn: ({ signal }) => fetchShell(null, signal),
        staleTime: SHELL_STALE_TIME_MS[keyScope],
      });
    },
    [env]
  );
};
