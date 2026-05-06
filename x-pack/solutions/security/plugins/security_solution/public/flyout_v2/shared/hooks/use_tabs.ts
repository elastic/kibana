/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef, useState } from 'react';
import { useKibana } from '../../../common/lib/kibana';

export interface UseTabsParams<T extends string> {
  /**
   * All valid tab IDs for this flyout panel.
   */
  validTabIds: readonly T[];
  /**
   * localStorage key used to persist the selected tab across sessions.
   */
  storageKey: string;
  /**
   * Tab ID to select on mount, or to sync to when it changes (e.g. from the
   * expandable-flyout URL path). Falls back to localStorage, then validTabIds[0].
   */
  initialTabId?: string | null;
}

export interface UseTabsResult<T extends string> {
  /**
   * The currently selected tab ID.
   */
  selectedTabId: T;
  /**
   * Callback to imperatively change the selected tab. Persists the selection to
   * localStorage.
   */
  setSelectedTabId: (tabId: T) => void;
}

const resolveTabId = <T extends string>(
  validTabIds: readonly T[],
  candidate: string | null | undefined
): T | undefined => {
  if (candidate != null && (validTabIds as readonly string[]).includes(candidate)) {
    return candidate as T;
  }
  return undefined;
};

/**
 * Generic hook for managing tab selection in a flyout panel.
 *
 * Resolves the active tab from (in priority order):
 *   1. `initialTabId` (e.g. expandable-flyout URL path or an explicit initial value)
 *   2. The value persisted in localStorage under `storageKey`
 *   3. `validTabIds[0]` as the final fallback
 */
export const useTabs = <T extends string>({
  validTabIds,
  storageKey,
  initialTabId,
}: UseTabsParams<T>): UseTabsResult<T> => {
  const { storage } = useKibana().services;

  const [selectedTabId, setSelectedTabIdState] = useState<T>(
    () =>
      resolveTabId(validTabIds, initialTabId) ??
      resolveTabId(validTabIds, storage.get(storageKey)) ??
      validTabIds[0]
  );

  // Sync to initialTabId changes during the render phase (no post-paint flash).
  // This covers URL-driven panels where `path?.tab` changes when `openRightPanel`
  // is called by the parent component.
  const prevInitialTabIdRef = useRef(initialTabId);
  if (prevInitialTabIdRef.current !== initialTabId) {
    prevInitialTabIdRef.current = initialTabId;
    const resolved = resolveTabId(validTabIds, initialTabId);
    if (resolved !== undefined && resolved !== selectedTabId) {
      setSelectedTabIdState(resolved);
    }
  }

  const setSelectedTabId = useCallback(
    (tabId: T) => {
      setSelectedTabIdState(tabId);
      storage.set(storageKey, tabId);
    },
    [storage, storageKey]
  );

  return { selectedTabId, setSelectedTabId };
};
