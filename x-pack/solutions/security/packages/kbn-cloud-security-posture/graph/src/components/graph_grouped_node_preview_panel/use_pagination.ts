/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useCallback } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';

export const GROUPED_PREVIEW_PAGINATION_SETTINGS_KEY =
  'securitySolution.graphGroupedNodePreview.pagination';

export const PAGE_SIZE_OPTIONS = [10, 20, 50];
export const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];

const STARTING_PAGE_INDEX = 0;

export interface PaginationLocalStorageState {
  pageSize: number;
}

export interface PaginationState extends PaginationLocalStorageState {
  pageIndex: number;
}
export interface Pagination {
  state: PaginationState;
  goToPage: (pageIndex: number) => void;
  setPageSize: (pageSize: number) => void;
}

/**
 * Custom hook to manage pagination state with localStorage persistence
 * Provides a single source of truth for pagination across components
 * Note: Only pageSize is persisted to localStorage; pageIndex always starts at 0
 *
 * @param nonFetchedDocumentsCount - Total count of documents that are already in memory (client-side pagination).
 *   - For grouped-entities mode: Pass entityItems.length (entities are in memory, pagination is client-side slicing)
 *   - For grouped-events mode: Pass 0 (events are fetched from ES, pagination is server-side)
 *
 * @returns Pagination object containing state and control functions
 */
export const usePagination = (nonFetchedDocumentsCount: number): Pagination => {
  // Initialize from localStorage or use defaults (only pageSize is persisted)
  const [storedSettings, setStoredSettings] = useLocalStorage<PaginationLocalStorageState>(
    GROUPED_PREVIEW_PAGINATION_SETTINGS_KEY,
    { pageSize: DEFAULT_PAGE_SIZE }
  );

  // Always start from the first page when component mounts, but preserve pageSize from localStorage
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: STARTING_PAGE_INDEX,
    pageSize: storedSettings?.pageSize || DEFAULT_PAGE_SIZE,
  });

  // Validate and reset pagination for client-side paginated documents (entities)
  // This only runs when nonFetchedDocumentsCount > 0, which means we have documents in memory.
  // For server-side pagination (events), nonFetchedDocumentsCount is 0, so this is skipped
  // because the fetch hook handles pagination validation internally.
  useEffect(() => {
    if (nonFetchedDocumentsCount > 0) {
      const maxPageIndex = Math.ceil(nonFetchedDocumentsCount / pagination.pageSize) - 1;
      // If current page is out of bounds (e.g., user was on page 5 but now only 2 pages exist),
      // reset to the first page to prevent showing an empty state
      if (pagination.pageIndex > maxPageIndex) {
        setPagination({ ...pagination, pageIndex: STARTING_PAGE_INDEX });
      }
    }
  }, [nonFetchedDocumentsCount, pagination]);

  const goToPage = useCallback(
    (pageIndex: number) => {
      setPagination({ ...pagination, pageIndex });
    },
    [pagination]
  );

  const setPageSize = useCallback(
    (pageSize: number) => {
      setPagination({ pageSize, pageIndex: STARTING_PAGE_INDEX });
      setStoredSettings({ pageSize });
    },
    [setPagination, setStoredSettings]
  );

  return {
    state: pagination,
    goToPage,
    setPageSize,
  };
};
