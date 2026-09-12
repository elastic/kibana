/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useLocalStorage } from './use_local_storage';
import { NEW_INDEX_DISMISSED_KEY } from '../constants';

interface DismissedIndex {
  indexName: string;
  createdAt: number;
}

/**
 * Tracks dismissal by index name *and* creation date, so deleting an index and recreating one with
 * the same name surfaces the footer again rather than staying hidden behind the old dismissal.
 */
export const useNewIndexDismissal = (indexName?: string, createdAt?: number) => {
  const [dismissedIndex, setDismissedIndex] = useLocalStorage<DismissedIndex | null>(
    NEW_INDEX_DISMISSED_KEY,
    null
  );

  const dismissNewIndex = useCallback(() => {
    if (indexName !== undefined && createdAt !== undefined) {
      setDismissedIndex({ indexName, createdAt });
    }
  }, [setDismissedIndex, indexName, createdAt]);

  return {
    isNewIndexDismissed:
      indexName !== undefined &&
      dismissedIndex?.indexName === indexName &&
      dismissedIndex?.createdAt === createdAt,
    dismissNewIndex,
  };
};
