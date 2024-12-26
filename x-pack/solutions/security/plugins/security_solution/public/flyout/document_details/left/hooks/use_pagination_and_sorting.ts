/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useReducer } from 'react';

const PAGE_SIZES = [5, 10, 20] as const;

export interface PaginationState {
  pageIndex: number;
  pageSize: number;
}

const initialPagination: PaginationState = { pageIndex: 0, pageSize: PAGE_SIZES[0] };

const paginationReducer = (_state: PaginationState, action: PaginationState): PaginationState => {
  return action;
};

export interface SortingState {
  enableAllColumns: boolean;
  sort: {
    field: string;
    direction: 'asc' | 'desc';
  };
}
const initialSorting: SortingState = {
  sort: {
    field: '@timestamp',
    direction: 'desc',
  },
  enableAllColumns: true,
};

const sortingReducer = (state: SortingState, action: SortingState['sort']): SortingState => {
  return {
    ...state,
    sort: action,
  };
};

/**
 * useSorting exposes resusable sorting logic that can be used with eui tables
 */
export const useSorting = () => {
  const [sorting, setSorting] = useReducer(sortingReducer, initialSorting);

  const sortConfig = useMemo(() => {
    return [
      {
        [sorting.sort.field]: sorting.sort.direction,
      },
    ];
  }, [sorting.sort.direction, sorting.sort.field]);

  return { sorting, setSorting, sortConfig };
};

/**
 * use pagination adds reusable logic that can be applied to
 * eui tables
 */
export const usePagination = () => {
  const [pagination, setPagination] = useReducer(paginationReducer, initialPagination);

  return useMemo(
    () => ({
      pageSizeOptions: [...PAGE_SIZES],
      pagination,
      setPagination,
    }),
    [pagination]
  );
};
