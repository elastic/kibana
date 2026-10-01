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
import { useKibana } from '../../../../common/lib/kibana';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
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
} from './common';
import { ALL_COLUMNS_LIST } from './columns/registry';
import { enrichEntityRows } from './enrich_entity_rows';

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
  whereExpression?: string;
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
  whereExpression,
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

  // whereExpression (URL filters, global query, NAT card IN-list, …) is part of every
  // key so shell + count + enrich all invalidate together when tiles/filters change.
  const shellQueryKey = [
    'entity-grid-fe',
    sortField,
    sortDirection,
    pageIndex,
    pageSize,
    cursorStr,
    whereExpression,
    timeRange,
    view,
    concreteEntityIndexName,
    spaceId,
  ] as const;

  const countQueryKey = [
    'entity-grid-fe-count',
    sortField,
    whereExpression,
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
        filterExpression: whereExpression,
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
        filterExpression: whereExpression,
      };

      const [countRow] = await runQuery(buildCountQuery(args));
      return (countRow?.total as number) ?? 0;
    },
    {
      enabled: !!concreteEntityIndexName,
      // Do not keepPreviousData: a stale unfiltered total leaves phantom pages when
      // whereExpression gains a NAT card IN-list (shell updates, count would look wrong).
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
      whereExpression,
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
        filterExpression: whereExpression,
      };

      return enrichEntityRows(rows, args, skip, { runQuery, http });
    },
    {
      enabled: !!concreteEntityIndexName && shellQuery.isSuccess && shellRows != null,
      onSuccess: () => setUpdatedAt(Date.now()),
    }
  );

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
