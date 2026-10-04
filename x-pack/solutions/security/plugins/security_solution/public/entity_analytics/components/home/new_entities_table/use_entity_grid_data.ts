/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, useQueryClient } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../../common/lib/kibana';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import { useErrorToast } from '../../../../common/hooks/use_error_toast';
import { useResolvedLatestEntitiesIndexName } from '../../../../common/hooks/use_resolved_latest_entities_index_name';
import type {
  TimeRange,
  RowsMode,
  EntityGridResponse,
  QueryArgs,
  Row,
  PageCursor,
  SortDir,
} from './common';
import {
  decodeCursor,
  encodeCursor,
  entityIdsOf,
  getEntityId,
  getNumber,
  GROUP_SIZE_FIELD,
  enrichEntityRows,
  createEsqlRunner,
  toSortValue,
} from './common';
import { ENRICH_FNS, findSortableColumn } from './columns/registry';

const GRID_QUERY_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.entitiesGrid.queryError',
  { defaultMessage: 'Error loading entities table' }
);

// ── query keys ────────────────────────────────────────────────────────────────

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
 * Query keys of the grid. The count key has no sort direction, page or cursor,
 * so the total is fetched once per sort field and filters.
 */
const entityGridKeys = {
  shell: (
    scope: GridQueryScope,
    page: { sortDirection: SortDir; pageIndex: number; pageSize: number; keepFieldsKey: string }
  ) => ['entity-grid', 'shell', { ...scope, ...page }] as const,
  count: (scope: GridQueryScope) => ['entity-grid', 'count', scope] as const,
  enrich: (
    scope: GridQueryScope,
    page: { sortDirection: SortDir; entityIdsKey: string; shellUpdatedAt: number }
  ) => ['entity-grid', 'enrich', { ...scope, ...page }] as const,
};

// ── helpers ───────────────────────────────────────────────────────────────────

const buildNextCursor = (pageRows: Row[], args: QueryArgs, hasNextPage: boolean): string | null => {
  const lastRow = pageRows[pageRows.length - 1];
  if (!hasNextPage || !lastRow) return null;

  return encodeCursor({
    sortField: args.sort.field,
    sortDirection: args.sort.direction,
    sortValue: toSortValue(lastRow[args.sort.field]),
    entityId: getEntityId(lastRow) ?? '',
  });
};

// ── hook ──────────────────────────────────────────────────────────────────────

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
}

export const useEntityGridData = ({
  sortField,
  sortDirection,
  pageIndex,
  pageSize,
  searchExpression,
  entityExpression,
  timeRange,
  rowsMode = 'resolved',
  keepFields,
}: UseEntityGridDataOptions) => {
  const queryClient = useQueryClient();
  const {
    data: { search: searchService },
    http,
  } = useKibana().services;

  const spaceId = useSpaceId() ?? 'default';
  const { data: resolvedIndex } = useResolvedLatestEntitiesIndexName(spaceId);
  const concreteEntityIndexName = resolvedIndex?.indexName ?? null;

  const keepFieldsKey = (keepFields ?? []).join('\0');
  const sortColumn = findSortableColumn(sortField);

  const scope: GridQueryScope = {
    sortField,
    searchExpression,
    entityExpression,
    timeRange,
    rowsMode,
    concreteEntityIndexName,
    spaceId,
  };
  const shellKey = (index: number) =>
    entityGridKeys.shell(scope, { sortDirection, pageIndex: index, pageSize, keepFieldsKey });

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
  });

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

  const cursorStr =
    fetchPageIndex === 0
      ? null
      : queryClient.getQueryData<EntityGridResponse>(shellKey(fetchPageIndex - 1))?.next_cursor ??
        null;
  const cursor: PageCursor | null = cursorStr ? decodeCursor(cursorStr) : null;

  const shellQuery = useQuery(
    shellKey(fetchPageIndex),
    async ({ signal }): Promise<EntityGridResponse> => {
      if (!concreteEntityIndexName) throw new Error('entity store index not resolved');
      if (!sortColumn) throw new Error(`Column ${sortField} is not sortable`);

      const args = buildArgs(concreteEntityIndexName, cursor);
      const allRows = await createEsqlRunner(
        searchService,
        signal
      )(sortColumn.buildSortQuery(args));
      const hasNextPage = allRows.length > pageSize;
      const pageRows = hasNextPage ? allRows.slice(0, pageSize) : allRows;

      return {
        entities: pageRows,
        next_cursor: buildNextCursor(pageRows, args, hasNextPage),
        total: null,
      };
    },
    {
      enabled: !!concreteEntityIndexName && (fetchPageIndex === 0 || cursorStr != null),
      // Keep painting the last page while the next shell key loads (page/sort/filter).
      // Count stays strict below so pagination totals don't lag behind the tile/filter.
      keepPreviousData: true,
    }
  );

  const countQuery = useQuery(
    entityGridKeys.count(scope),
    async ({ signal }): Promise<number> => {
      if (!concreteEntityIndexName) throw new Error('entity store index not resolved');
      if (!sortColumn) throw new Error(`Column ${sortField} is not sortable`);

      const args = buildArgs(concreteEntityIndexName, null);
      const [countRow] = await createEsqlRunner(
        searchService,
        signal
      )(sortColumn.buildCountQuery(args));
      return (countRow && getNumber(countRow, 'total')) ?? 0;
    },
    {
      enabled: !!concreteEntityIndexName,
      // No keepPreviousData: a stale unfiltered total invents phantom pages after a
      // tile/filter. `total` below falls back to the painted page so rowCount does
      // not snap to 0 and collapse the grid.
    }
  );

  const isCurrentPage = fetchPageIndex === pageIndex;
  const shellRows = isCurrentPage ? shellQuery.data?.entities : undefined;

  const enrichQuery = useQuery(
    entityGridKeys.enrich(scope, {
      sortDirection,
      entityIdsKey: entityIdsOf(shellRows ?? []).join('\0'),
      shellUpdatedAt: shellQuery.dataUpdatedAt,
    }),
    async ({ signal }): Promise<Row[]> => {
      if (!concreteEntityIndexName || !shellRows) return [];

      const skip = new Set<string>([sortField]);
      if (rowsMode === 'individual') skip.add(GROUP_SIZE_FIELD);

      return enrichEntityRows(
        shellRows,
        buildArgs(concreteEntityIndexName, cursor),
        skip,
        { runQuery: createEsqlRunner(searchService, signal), http, signal },
        ENRICH_FNS
      );
    },
    {
      enabled:
        isCurrentPage &&
        !!concreteEntityIndexName &&
        shellQuery.isSuccess &&
        !shellQuery.isPreviousData &&
        shellRows != null,
      keepPreviousData: true,
    }
  );

  // Prefer shell (empties the grid), then count / enrich — one toast when several fail together.
  useErrorToast(GRID_QUERY_ERROR_TITLE, shellQuery.error ?? countQuery.error ?? enrichQuery.error);

  // keepPreviousData on both queries holds the last page across key changes. Do not
  // paint previous enrich onto a new shell (different entity ids).
  const rows =
    (shellQuery.isPreviousData
      ? enrichQuery.data ?? shellRows
      : enrichQuery.isPreviousData
      ? shellRows
      : enrichQuery.data ?? shellRows) ?? [];
  const total = countQuery.data ?? (rows.length > 0 ? pageIndex * pageSize + rows.length : 0);
  const updatedAt = Math.max(shellQuery.dataUpdatedAt, enrichQuery.dataUpdatedAt) || null;

  return {
    rows,
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
