/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type { FlyoutPrevNextNavigation } from './types';

export interface UseFlyoutPrevNextNavArgs<T extends { id: string }> {
  /** Ordered items of the currently loaded page, including non-navigable ones. */
  items: T[];
  /** Id of the item currently opened in the flyout, if any. */
  openedItemId?: string;
  /** Whether an item can be shown in the flyout. Non-navigable items are skipped. */
  isNavigable: (item: T) => boolean;
  /** Opens the given item in the flyout. */
  onNavigate: (item: T) => void;
}

export const useFlyoutPrevNextNav = <T extends { id: string }>({
  items,
  openedItemId,
  isNavigable,
  onNavigate,
}: UseFlyoutPrevNextNavArgs<T>): FlyoutPrevNextNavigation => {
  const navigableItems = useMemo(() => items.filter(isNavigable), [items, isNavigable]);

  // -1 when nothing is open or the opened item is not navigable / not in the loaded page.
  const openedIndex = useMemo(
    () => (openedItemId ? navigableItems.findIndex((item) => item.id === openedItemId) : -1),
    [navigableItems, openedItemId]
  );

  const goToNext = useCallback(() => {
    const nextItem = navigableItems[openedIndex + 1];
    // Without the -1 guard, `navigableItems[-1 + 1]` would jump to the first item.
    if (openedIndex !== -1 && nextItem) {
      onNavigate(nextItem);
    }
  }, [navigableItems, openedIndex, onNavigate]);

  const goToPrevious = useCallback(() => {
    const previousItem = navigableItems[openedIndex - 1];
    if (openedIndex !== -1 && previousItem) {
      onNavigate(previousItem);
    }
  }, [navigableItems, openedIndex, onNavigate]);

  return useMemo(
    () => ({
      hasNext: openedIndex !== -1 && openedIndex < navigableItems.length - 1,
      hasPrevious: openedIndex > 0,
      goToNext,
      goToPrevious,
    }),
    [openedIndex, navigableItems.length, goToNext, goToPrevious]
  );
};
