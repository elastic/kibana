/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef, useState } from 'react';
import { useKibana } from '../../../common/lib/kibana';
import type { FlyoutType } from '../../../common/lib/telemetry';
import { useFlyoutTelemetry } from './use_flyout_telemetry';

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
  /**
   * When provided, an explicit `setSelectedTabId` call (not the render-phase URL sync) reports a
   * `FlyoutTabClicked` event tagged with this flyout type. Omit to skip tab-click telemetry.
   */
  flyoutType?: FlyoutType;
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
  flyoutType,
}: UseTabsParams<T>): UseTabsResult<T> => {
  const { storage } = useKibana().services;
  const { reportTabClicked } = useFlyoutTelemetry();

  const [selectedTabId, setSelectedTabIdState] = useState<T>(
    () =>
      resolveTabId(validTabIds, initialTabId) ??
      resolveTabId(validTabIds, storage.get(storageKey)) ??
      validTabIds[0]
  );

  // If `initialTabId` changes (e.g. the v1 expandable flyouts pass the URL-persisted
  // `path.tab`), sync the selected tab during render to avoid a post-paint flash.
  // This does not write to localStorage — only an explicit `setSelectedTabId` does —
  // so an externally-driven change never overwrites the user's stored preference.
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
      if (flyoutType) {
        reportTabClicked({ flyoutType, tabId });
      }
    },
    [storage, storageKey, flyoutType, reportTabClicked]
  );

  return { selectedTabId, setSelectedTabId };
};
