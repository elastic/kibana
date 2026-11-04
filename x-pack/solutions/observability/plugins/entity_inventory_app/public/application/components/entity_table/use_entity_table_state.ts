/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import type { EuiDataGridSorting } from '@elastic/eui';
import type { InventoryRow } from '../../../inventory_api/types';

export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

type SortingColumns = EuiDataGridSorting['columns'];

/**
 * Column visibility, sorting and pagination of one results table. None of it is persisted (#6330).
 * The table goes back to its first page whenever the rows, the sort or the page size change.
 */
export const useEntityTableState = ({
  defaultVisibleColumns,
  rows,
}: {
  defaultVisibleColumns: string[];
  rows: readonly InventoryRow[];
}) => {
  const [visibleColumns, setVisibleColumns] = useState(defaultVisibleColumns);
  // No sort keeps the server order: last seen, newest first.
  const [sortingColumns, setSortingColumns] = useState<SortingColumns>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => setPageIndex(0), [rows]);

  const onSort = useCallback((nextSortingColumns: SortingColumns) => {
    setSortingColumns(nextSortingColumns);
    setPageIndex(0);
  }, []);

  const onChangeItemsPerPage = useCallback((nextPageSize: number) => {
    setPageSize(nextPageSize);
    setPageIndex(0);
  }, []);

  const reset = useCallback(() => {
    setVisibleColumns(defaultVisibleColumns);
    setSortingColumns([]);
    setPageIndex(0);
  }, [defaultVisibleColumns]);

  return {
    visibleColumns,
    setVisibleColumns,
    sortingColumns,
    onSort,
    pageIndex,
    setPageIndex,
    pageSize,
    onChangeItemsPerPage,
    reset,
  };
};
