/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import { useQuery, useQueryClient } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../../common/lib/kibana';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import { useErrorToast } from '../../../../common/hooks/use_error_toast';
import { useResolvedLatestEntitiesIndexName } from '../../../../common/hooks/use_resolved_latest_entities_index_name';
import type { TimeRange, RowsMode, EntityGridResponse, QueryArgs, Row, PageCursor } from './common';
import {
  decodeCursor,
  encodeCursor,
  ENTITY_ID_FIELD,
  GROUP_SIZE_FIELD,
  enrichEntityRows,
  createEsqlRunner,
} from './common';
import { ALL_COLUMNS_LIST, ENRICH_FNS } from './columns/registry';

const GRID_QUERY_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.entitiesGrid.queryError',
  { defaultMessage: 'Error loading entities table' }
);

// ── helpers ───────────────────────────────────────────────────────────────────

const buildNextCursor = (pageRows: Row[], args: QueryArgs, hasNextPage: boolean): string | null => {
  const lastRow = pageRows[pageRows.length - 1];
  if (!hasNextPage || !lastRow) return null;

  return encodeCursor({
    sortField: args.sort.field,
    sortDirection: args.sort.direction,
    sortValue: lastRow[args.sort.field] ?? null,
    entityId: (lastRow[ENTITY_ID_FIELD] as string) ?? '',
  });
};

const pageEntityIdsKey = (rows: Row[] | undefined): string =>
  (rows ?? []).map((r) => r[ENTITY_ID_FIELD] as string).join('\0');

// ── hook ──────────────────────────────────────────────────────────────────────

export interface UseEntityGridDataOptions {
  sortField: string;
  sortDirection: 'asc' | 'desc';
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

  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  const keepFieldsKey = (keepFields ?? []).join('\0');

  const shellKey = (index: number) =>
    [
      'entity-grid-fe',
      sortField,
      sortDirection,
      index,
      pageSize,
      searchExpression,
      entityExpression,
      timeRange,
      rowsMode,
      concreteEntityIndexName,
      spaceId,
      keepFieldsKey,
    ] as const;

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

  const shellQueryKey = shellKey(fetchPageIndex);

  const countQueryKey = [
    'entity-grid-fe-count',
    sortField,
    searchExpression,
    entityExpression,
    timeRange,
    rowsMode,
    concreteEntityIndexName,
    spaceId,
  ] as const;

  const shellQuery = useQuery(
    shellQueryKey,
    async ({ signal }): Promise<EntityGridResponse> => {
      if (!concreteEntityIndexName) throw new Error('entity store index not resolved');

      const runQuery = createEsqlRunner(searchService, signal);

      const col = ALL_COLUMNS_LIST.find((c) => c.id === sortField);
      const { buildSortQuery } = col ?? {};
      if (!buildSortQuery) throw new Error(`No sort handler for column: ${sortField}`);

      const args: QueryArgs = {
        namespace: spaceId,
        timeRange,
        sort: { field: sortField, direction: sortDirection },
        cursor,
        pageSize,
        rowsMode,
        concreteEntityIndexName,
        searchExpression,
        entityExpression,
        keepFields,
      };

      const allRows = await runQuery(buildSortQuery(args));
      const hasNextPage = allRows.length > pageSize;
      const pageRows = hasNextPage ? allRows.slice(0, pageSize) : allRows;
      const nextCursor = buildNextCursor(pageRows, args, hasNextPage);

      return {
        entities: pageRows,
        next_cursor: nextCursor,
        total: null,
      };
    },
    {
      enabled: !!concreteEntityIndexName && (fetchPageIndex === 0 || cursorStr != null),
      // Keep painting the last page while the next shell key loads (page/sort/filter).
      // Count stays strict below so pagination totals don't lag behind the tile/filter.
      keepPreviousData: true,
      onSuccess: () => setUpdatedAt(Date.now()),
    }
  );

  const countQuery = useQuery(
    countQueryKey,
    async ({ signal }): Promise<number> => {
      if (!concreteEntityIndexName) throw new Error('entity store index not resolved');

      const runQuery = createEsqlRunner(searchService, signal);

      const col = ALL_COLUMNS_LIST.find((c) => c.id === sortField);
      const { buildCountQuery } = col ?? {};
      if (!buildCountQuery) throw new Error(`No count handler for column: ${sortField}`);

      const args: QueryArgs = {
        namespace: spaceId,
        timeRange,
        sort: { field: sortField, direction: sortDirection },
        cursor: null,
        pageSize,
        rowsMode,
        concreteEntityIndexName,
        searchExpression,
        entityExpression,
        keepFields,
      };

      const [countRow] = await runQuery(buildCountQuery(args));
      return (countRow?.total as number) ?? 0;
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
  const entityIdsKey = pageEntityIdsKey(shellRows);

  const enrichQuery = useQuery(
    [
      'entity-grid-fe-enrich',
      entityIdsKey,
      sortField,
      sortDirection,
      searchExpression,
      entityExpression,
      timeRange,
      rowsMode,
      concreteEntityIndexName,
      spaceId,
      shellQuery.dataUpdatedAt,
    ],
    async ({ signal }): Promise<Row[]> => {
      if (!concreteEntityIndexName) return [];
      const shell = queryClient.getQueryData<EntityGridResponse>(shellQueryKey);
      const pageRows = shell?.entities;
      if (!pageRows) return [];

      const runQuery = createEsqlRunner(searchService, signal);

      const col = ALL_COLUMNS_LIST.find((c) => c.id === sortField);
      const skip = new Set<string>([...(col ? [col.id] : [])]);
      if (rowsMode === 'individual') skip.add(GROUP_SIZE_FIELD);

      const args: QueryArgs = {
        namespace: spaceId,
        timeRange,
        sort: { field: sortField, direction: sortDirection },
        cursor,
        pageSize,
        rowsMode,
        concreteEntityIndexName,
        searchExpression,
        entityExpression,
        keepFields,
      };

      return enrichEntityRows(pageRows, args, skip, { runQuery, http, signal }, ENRICH_FNS);
    },
    {
      enabled:
        isCurrentPage &&
        !!concreteEntityIndexName &&
        shellQuery.isSuccess &&
        !shellQuery.isPreviousData &&
        shellRows != null,
      keepPreviousData: true,
      onSuccess: () => setUpdatedAt(Date.now()),
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
