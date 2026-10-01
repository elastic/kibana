/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom } from 'rxjs';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@kbn/react-query';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../../common/lib/kibana';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import { useErrorToast } from '../../../../common/hooks/use_error_toast';
import { useResolvedLatestEntitiesIndexName } from '../../../../common/hooks/use_resolved_latest_entities_index_name';
import type {
  TimeRange,
  EntityGridResponse,
  QueryArgs,
  Row,
  EsqlRunner,
  PageCursor,
} from './common';
import {
  decodeCursor,
  encodeCursor,
  esqlResponseToRows,
  ENTITY_ID_FIELD,
  GROUP_SIZE_FIELD,
  enrichEntityRows,
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

const createRunQuery = (searchService: DataPublicPluginStart['search']): EsqlRunner => {
  return async (query) =>
    esqlResponseToRows(
      await lastValueFrom(searchService.search({ params: { query } }, { strategy: 'esql_async' }))
    );
};

// ── hook ──────────────────────────────────────────────────────────────────────

export interface UseEntityGridDataOptions {
  sortField: string;
  sortDirection: 'asc' | 'desc';
  pageIndex: number;
  pageSize: number;
  cursors: Array<string | null>;
  onNextCursor: (pageIndex: number, cursor: string) => void;
  searchExpression?: string;
  entityExpression?: string;
  timeRange: TimeRange;
  view?: 'resolved' | 'raw';
}

export const useEntityGridData = ({
  sortField,
  sortDirection,
  pageIndex,
  pageSize,
  cursors,
  onNextCursor,
  searchExpression,
  entityExpression,
  timeRange,
  view = 'resolved',
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

  const cursorStr = cursors[pageIndex] ?? null;
  const cursor: PageCursor | null = cursorStr ? decodeCursor(cursorStr) : null;

  // Filter expressions (search bar, URL filters, NAT card IN-list, …) are part of every
  // key so shell + count + enrich all invalidate together when tiles/filters change.
  const shellQueryKey = [
    'entity-grid-fe',
    sortField,
    sortDirection,
    pageIndex,
    pageSize,
    cursorStr,
    searchExpression,
    entityExpression,
    timeRange,
    view,
    concreteEntityIndexName,
    spaceId,
  ] as const;

  const countQueryKey = [
    'entity-grid-fe-count',
    sortField,
    searchExpression,
    entityExpression,
    timeRange,
    view,
    concreteEntityIndexName,
    spaceId,
  ] as const;

  const shellQuery = useQuery(
    shellQueryKey,
    async (): Promise<EntityGridResponse> => {
      if (!concreteEntityIndexName) throw new Error('entity store index not resolved');

      const runQuery = createRunQuery(searchService);

      const col = ALL_COLUMNS_LIST.find((c) => c.id === sortField);
      const { buildSortQuery } = col ?? {};
      if (!buildSortQuery) throw new Error(`No sort handler for column: ${sortField}`);

      const args: QueryArgs = {
        namespace: spaceId,
        timeRange,
        sort: { field: sortField, direction: sortDirection },
        cursor,
        pageSize,
        view,
        concreteEntityIndexName,
        searchExpression,
        entityExpression,
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
      enabled: !!concreteEntityIndexName,
      // Keep painting the last page while the next shell key loads (page/sort/filter).
      // Count stays strict below so pagination totals don't lag behind the tile/filter.
      keepPreviousData: true,
      onSuccess: (result) => {
        if (result.next_cursor && !cursors[pageIndex + 1]) {
          onNextCursor(pageIndex + 1, result.next_cursor);
        }
        setUpdatedAt(Date.now());
      },
    }
  );

  const countQuery = useQuery(
    countQueryKey,
    async (): Promise<number> => {
      if (!concreteEntityIndexName) throw new Error('entity store index not resolved');

      const runQuery = createRunQuery(searchService);

      const col = ALL_COLUMNS_LIST.find((c) => c.id === sortField);
      const { buildCountQuery } = col ?? {};
      if (!buildCountQuery) throw new Error(`No count handler for column: ${sortField}`);

      const args: QueryArgs = {
        namespace: spaceId,
        timeRange,
        sort: { field: sortField, direction: sortDirection },
        cursor: null,
        pageSize,
        view,
        concreteEntityIndexName,
        searchExpression,
        entityExpression,
      };

      const [countRow] = await runQuery(buildCountQuery(args));
      return (countRow?.total as number) ?? 0;
    },
    {
      enabled: !!concreteEntityIndexName,
      // Do not keepPreviousData: a stale unfiltered total leaves phantom pages when
      // entityExpression gains a NAT tile IN-list (shell updates, count would look wrong).
    }
  );

  const shellRows = shellQuery.data?.entities;
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
      view,
      concreteEntityIndexName,
      spaceId,
      shellQuery.dataUpdatedAt,
    ],
    async (): Promise<Row[]> => {
      if (!concreteEntityIndexName) return [];
      const shell = queryClient.getQueryData<EntityGridResponse>(shellQueryKey);
      const rows = shell?.entities;
      if (!rows) return [];

      const runQuery = createRunQuery(searchService);

      const col = ALL_COLUMNS_LIST.find((c) => c.id === sortField);
      const skip = new Set<string>([...(col ? [col.id] : [])]);
      if (view === 'raw') skip.add(GROUP_SIZE_FIELD);

      const args: QueryArgs = {
        namespace: spaceId,
        timeRange,
        sort: { field: sortField, direction: sortDirection },
        cursor,
        pageSize,
        view,
        concreteEntityIndexName,
        searchExpression,
        entityExpression,
      };

      return enrichEntityRows(rows, args, skip, { runQuery, http }, ENRICH_FNS);
    },
    {
      enabled: !!concreteEntityIndexName && shellQuery.isSuccess && shellRows != null,
      onSuccess: () => setUpdatedAt(Date.now()),
    }
  );

  // Prefer shell (empties the grid), then count / enrich — one toast when several fail together.
  useErrorToast(GRID_QUERY_ERROR_TITLE, shellQuery.error ?? countQuery.error ?? enrichQuery.error);

  return {
    rows: enrichQuery.data ?? shellRows ?? [],
    total: countQuery.data ?? 0,
    updatedAt,
    isFetching:
      shellQuery.isFetching ||
      enrichQuery.isFetching ||
      countQuery.isFetching ||
      !concreteEntityIndexName,
    isLastPage: shellQuery.data != null && shellQuery.data.next_cursor == null,
  };
};
