/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { type Dispatch, type SetStateAction, useCallback, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import type { BoolQuery, Filter, Query } from '@kbn/es-query';
import type { CriteriaWithPagination } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import deepEqual from 'fast-deep-equal';
import { useKibana } from '../../../../../common/lib/kibana';
import { inputsActions } from '../../../../../common/store/inputs';
import { InputsModelId } from '../../../../../common/store/inputs/constants';
import { useUrlQuery } from './use_url_query';
import { usePageSize } from './use_page_size';
import { useBaseEsQuery } from './use_base_es_query';
import { usePersistedQuery } from './use_persisted_query';

export interface EntitiesBaseURLQuery {
  query: Query;
  filters: Filter[];
  pageFilters?: Filter[];
  groupBy?: string[];
}

export type URLQuery = EntitiesBaseURLQuery & Record<string, unknown>;

type SortOrder = [string, string];

const getPageIndexOrDefault = (pageIndex: unknown): number =>
  typeof pageIndex === 'number' && Number.isFinite(pageIndex) ? pageIndex : 0;

export interface EntityURLStateResult {
  setUrlQuery: (query: Record<string, unknown>) => void;
  sort: SortOrder[];
  filters: Filter[];
  pageFilters: Filter[];
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

const getDefaultQuery = ({ query, filters }: EntitiesBaseURLQuery) => ({
  query,
  filters,
  pageFilters: [],
  sort: { field: '@timestamp', direction: 'desc' },
  pageIndex: 0,
});
export const useEntityURLState = ({
  defaultQuery = getDefaultQuery,
  paginationLocalStorageKey,
  columnsLocalStorageKey,
}: {
  defaultQuery?: (params: EntitiesBaseURLQuery) => URLQuery;
  paginationLocalStorageKey: string;
  columnsLocalStorageKey: string;
}): EntityURLStateResult => {
  const getPersistedDefaultQuery = usePersistedQuery<URLQuery>(defaultQuery);
  const { urlQuery, setUrlQuery } = useUrlQuery<URLQuery>(getPersistedDefaultQuery);
  const { pageSize, setPageSize } = usePageSize(paginationLocalStorageKey);

  const {
    data: {
      query: { filterManager },
    },
  } = useKibana().services;
  const dispatch = useDispatch();

  // Track current URL filters in a render-phase ref so the subscription below
  // can detect whether a filterManager update was triggered by us (URL → filterManager)
  // or by the user (e.g. removing a filter pill).
  const urlFiltersRef = useRef<Filter[]>([]);
  urlFiltersRef.current = urlQuery.filters || [];

  // URL state → filterManager: keeps filter pills visible in the filter bar.
  // The deepEqual guard defends against reference churn from unrelated URL updates
  // (like `flyout` params), preventing a redundant filterManager emission that would
  // cascade into filter-bar re-renders.
  const lastAppliedFiltersRef = useRef<Filter[] | null>(null);
  useEffect(() => {
    const nextFilters = urlQuery.filters || [];
    if (
      lastAppliedFiltersRef.current !== null &&
      deepEqual(lastAppliedFiltersRef.current, nextFilters)
    ) {
      return;
    }
    lastAppliedFiltersRef.current = nextFilters;
    filterManager.setAppFilters(nextFilters);
  }, [filterManager, urlQuery.filters]);

  // filterManager → URL state: syncs removals made via the filter bar back to URL state.
  // The deepEqual guard prevents a circular update when setAppFilters above causes
  // filterManager to emit, since at that point urlFiltersRef already reflects the
  // new URL state.
  useEffect(() => {
    const subscription = filterManager.getUpdates$().subscribe(() => {
      const appFilters = filterManager.getAppFilters();
      if (!deepEqual(appFilters, urlFiltersRef.current)) {
        setUrlQuery({ filters: appFilters });
      }
    });
    return () => subscription.unsubscribe();
  }, [filterManager, setUrlQuery]);

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

    dispatch(
      inputsActions.setFilterQuery({
        id: InputsModelId.global,
        query: '',
        language: 'kuery',
      })
    );

    dispatch(
      inputsActions.setSavedQuery({
        id: InputsModelId.global,
        savedQuery: undefined,
      })
    );
  }, [setUrlQuery, dispatch]);

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

  const baseEsQuery = useBaseEsQuery({
    filters: urlQuery.filters,
    pageFilters: urlQuery.pageFilters,
    query: urlQuery.query,
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
    pageFilters: urlQuery.pageFilters || [],
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
    pageIndex: getPageIndexOrDefault(urlQuery.pageIndex),
    urlQuery,
    setTableOptions,
    handleUpdateQuery,
    pageSize,
    setPageSize,
    onChangeItemsPerPage,
    onChangePage,
    onSort,
    onResetFilters,
    columnsLocalStorageKey,
    getRowsFromPages,
  };
};
