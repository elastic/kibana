/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useState, useEffect, type SetStateAction } from 'react';
import { DEFAULT_VISIBLE_ROWS_PER_PAGE } from '../../constants';

/**
 * @description handles persisting the users table row size selection
 * @param localStorageKey - Optional key for localStorage. If not provided, page size will not be persisted.
 */
export const usePageSize = (localStorageKey?: string) => {
  const [pageSize, setPageSizeState] = useState<number>(() => {
    if (!localStorageKey || typeof window === 'undefined') {
      return DEFAULT_VISIBLE_ROWS_PER_PAGE;
    }

    try {
      const storedValue = window.localStorage.getItem(localStorageKey);
      if (storedValue != null) {
        const parsedValue = Number(JSON.parse(storedValue));
        if (Number.isFinite(parsedValue) && parsedValue > 0) {
          return parsedValue;
        }
      }
    } catch (error) {
      // noop - fallback to default
    }

    return DEFAULT_VISIBLE_ROWS_PER_PAGE;
  });

  // Persist to localStorage when key is provided
  useEffect(() => {
    if (!localStorageKey || typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(localStorageKey, JSON.stringify(pageSize));
    } catch (error) {
      // noop - best effort persistence
    }
  }, [localStorageKey, pageSize]);

  const setPageSize = useCallback((value: SetStateAction<number | undefined>) => {
    setPageSizeState((previous) => {
      const resolvedValue = typeof value === 'function' ? value(previous) : value;
      const nextValue = resolvedValue ?? DEFAULT_VISIBLE_ROWS_PER_PAGE;
      return nextValue > 0 ? nextValue : previous;
    });
  }, []);

  return {
    pageSize,
    setPageSize,
  };
};
