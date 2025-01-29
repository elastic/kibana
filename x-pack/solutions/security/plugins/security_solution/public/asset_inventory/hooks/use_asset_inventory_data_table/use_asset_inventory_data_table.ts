/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { type Dispatch, type SetStateAction, useCallback } from 'react';
import type { BoolQuery, Filter, Query } from '@kbn/es-query';
import type { CriteriaWithPagination } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { useUrlQuery } from './use_url_query';
import { usePageSize } from './use_page_size';
import { getDefaultQuery } from './utils';
import { useBaseEsQuery } from './use_base_es_query';
import { usePersistedQuery } from './use_persisted_query';

const LOCAL_STORAGE_DATA_TABLE_COLUMNS_KEY = 'assetInventory:dataTable:columns';

export interface AssetsBaseURLQuery {
  query: Query;
  filters: Filter[];
  /**
   * Filters that are part of the query but not persisted in the URL or in the Filter Manager
   */
  nonPersistedFilters?: Filter[];
  /**
   * Grouping component selection
   */
  groupBy?: string[];
}

export type URLQuery = AssetsBaseURLQuery & Record<string, unknown>;

type SortOrder = [string, string];

export interface AssetInventoryDataTableResult {
  setUrlQuery: (query: Record<string, unknown>) => void;
  sort: SortOrder[];
  filters: Filter[];
  query: { bool: BoolQuery };
  queryError?: Error;
  pageIndex: number;
  urlQuery: URLQuery;
  setTableOptions: (options: CriteriaWithPagination<object>) => void;
  handleUpdateQuery: (query: URLQuery) => void;
  pageSize: number;
  setPageSize: Dispatch<SetStateAction<number | undefined>>;
  onChangeItemsPerPage: (newPageSize: number) => void;
  onChangePage: (newPageIndex: number) => void;
  onSort: (sort: string[][]) => void;
  onResetFilters: () => void;
  columnsLocalStorageKey: string;
  getRowsFromPages: (data: Array<{ page: DataTableRecord[] }> | undefined) => DataTableRecord[];
}

/*
  Hook for managing common table state and methods for the Asset Inventory DataTable
*/
export const useAssetInventoryDataTable = ({
  defaultQuery = getDefaultQuery,
  paginationLocalStorageKey,
  columnsLocalStorageKey,
  nonPersistedFilters,
}: {
  defaultQuery?: (params: AssetsBaseURLQuery) => URLQuery;
  paginationLocalStorageKey: string;
  columnsLocalStorageKey?: string;
  nonPersistedFilters?: Filter[];
}): AssetInventoryDataTableResult => {
  const getPersistedDefaultQuery = usePersistedQuery<URLQuery>(defaultQuery);
  const { urlQuery, setUrlQuery } = useUrlQuery<URLQuery>(getPersistedDefaultQuery);
  const { pageSize, setPageSize } = usePageSize(paginationLocalStorageKey);

  const onChangeItemsPerPage = useCallback(
    (newPageSize: number) => {
      setPageSize(newPageSize);
      setUrlQuery({
        pageIndex: 0,
        pageSize: newPageSize,
      });
    },
    [setPageSize, setUrlQuery]
  );

  const onResetFilters = useCallback(() => {
    setUrlQuery({
      pageIndex: 0,
      filters: [],
      query: {
        query: '',
        language: 'kuery',
      },
    });
  }, [setUrlQuery]);

  const onChangePage = useCallback(
    (newPageIndex: number) => {
      setUrlQuery({
        pageIndex: newPageIndex,
      });
    },
    [setUrlQuery]
  );

  const onSort = useCallback(
    (sort: string[][]) => {
      setUrlQuery({
        sort,
      });
    },
    [setUrlQuery]
  );

  const setTableOptions = useCallback(
    ({ page, sort }: CriteriaWithPagination<object>) => {
      setPageSize(page.size);
      setUrlQuery({
        sort,
        pageIndex: page.index,
      });
    },
    [setUrlQuery, setPageSize]
  );

  /**
   * Page URL query to ES query
   */
  const baseEsQuery = useBaseEsQuery({
    filters: urlQuery.filters,
    query: urlQuery.query,
    ...(nonPersistedFilters ? { nonPersistedFilters } : {}),
  });

  const handleUpdateQuery = useCallback(
    (query: URLQuery) => {
      setUrlQuery({ ...query, pageIndex: 0 });
    },
    [setUrlQuery]
  );

  const getRowsFromPages = (data: Array<{ page: DataTableRecord[] }> | undefined) =>
    data
      ?.map(({ page }: { page: DataTableRecord[] }) => {
        return page;
      })
      .flat() || [];

  const queryError = baseEsQuery instanceof Error ? baseEsQuery : undefined;

  return {
    setUrlQuery,
    sort: urlQuery.sort as SortOrder[],
    filters: urlQuery.filters || [],
    query: baseEsQuery.query
      ? baseEsQuery.query
      : {
          bool: {
            must: [],
            filter: [],
            should: [],
            must_not: [],
          },
        },
    queryError,
    pageIndex: urlQuery.pageIndex as number,
    urlQuery,
    setTableOptions,
    handleUpdateQuery,
    pageSize,
    setPageSize,
    onChangeItemsPerPage,
    onChangePage,
    onSort,
    onResetFilters,
    columnsLocalStorageKey: columnsLocalStorageKey || LOCAL_STORAGE_DATA_TABLE_COLUMNS_KEY,
    getRowsFromPages,
  };
};
