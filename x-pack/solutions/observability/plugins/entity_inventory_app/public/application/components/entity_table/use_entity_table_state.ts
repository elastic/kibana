/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import type { EuiDataGridSorting } from '@elastic/eui';
import type { InventoryRow } from '../../../inventory_api/types';

export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

type SortingColumns = EuiDataGridSorting['columns'];

/**
 * The choices a user made in a results table. An unset field means the default, so resetting is
 * clearing the object. The owner of this state outlives the table, which unmounts while a range
 * has no entities or a load failed.
 */
export interface EntityTablePreferences {
  visibleColumns?: string[];
  sortingColumns?: SortingColumns;
  pageSize?: number;
}

export const NO_PREFERENCES: EntityTablePreferences = {};

/**
 * Column visibility, sorting and pagination of one results table. The choices live in
 * `preferences`, kept by the caller and not persisted beyond it (#6330). The table goes back to
 * its first page whenever the rows, the sort or the page size change.
 */
export const useEntityTableState = ({
  defaultVisibleColumns,
  rows,
  preferences,
  onPreferencesChange,
}: {
  defaultVisibleColumns: string[];
  rows: readonly InventoryRow[];
  preferences: EntityTablePreferences;
  onPreferencesChange: (preferences: EntityTablePreferences) => void;
}) => {
  // No sort keeps the server order: last seen, newest first.
  const {
    visibleColumns = defaultVisibleColumns,
    sortingColumns = [],
    pageSize = DEFAULT_PAGE_SIZE,
  } = preferences;
  const [pageIndex, setPageIndex] = useState(0);

  // Adjusting state while rendering, rather than in an effect, avoids a frame at a stale page.
  const [pageRows, setPageRows] = useState(rows);
  if (pageRows !== rows) {
    setPageRows(rows);
    setPageIndex(0);
  }

  const setVisibleColumns = useCallback(
    (nextVisibleColumns: string[]) =>
      onPreferencesChange({ ...preferences, visibleColumns: nextVisibleColumns }),
    [preferences, onPreferencesChange]
  );

  const onSort = useCallback(
    (nextSortingColumns: SortingColumns) => {
      onPreferencesChange({ ...preferences, sortingColumns: nextSortingColumns });
      setPageIndex(0);
    },
    [preferences, onPreferencesChange]
  );

  const onChangeItemsPerPage = useCallback(
    (nextPageSize: number) => {
      onPreferencesChange({ ...preferences, pageSize: nextPageSize });
      setPageIndex(0);
    },
    [preferences, onPreferencesChange]
  );

  const reset = useCallback(() => {
    onPreferencesChange(NO_PREFERENCES);
    setPageIndex(0);
  }, [onPreferencesChange]);

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
