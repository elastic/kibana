/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';

export interface UseMigrationFlyoutNavArgs {
  currentIdx: number;
  totalItems: number;
  onNextCallback: (nextIdx: number) => void;
  onPrevCallback: (prevIdx: number) => void;
}

export interface UseMigrationFlyoutNavResult {
  hasNext: boolean;
  hasPrevious: boolean;
  goToNext: () => void;
  goToPrevious: () => void;
}

export const useMigrationFlyoutNav = ({
  currentIdx,
  totalItems,
  onNextCallback,
  onPrevCallback,
}: UseMigrationFlyoutNavArgs): UseMigrationFlyoutNavResult => {
  const goToNext = useCallback(() => {
    if (currentIdx < totalItems - 1) {
      onNextCallback(currentIdx + 1);
    }
  }, [currentIdx, totalItems, onNextCallback]);

  const goToPrevious = useCallback(() => {
    if (currentIdx > 0) {
      onPrevCallback(currentIdx - 1);
    }
  }, [currentIdx, onPrevCallback]);

  return {
    hasNext: currentIdx < totalItems - 1,
    hasPrevious: currentIdx > 0,
    goToNext,
    goToPrevious,
  };
};
