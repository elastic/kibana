/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { useKibana } from '../../../../common/lib/kibana';
import { FLYOUT_STORAGE_KEYS } from '../constants/local_storage';
import type { RightPanelPaths } from '../tabs';

const validTabIds: RightPanelPaths[] = ['overview', 'table', 'json'];

export interface UseTabsParams {
  /**
   * Initially selected tab ID (e.g. from URL or parent state)
   */
  initialTabId?: string;
}

export interface UseTabsResult {
  /**
   * The currently selected tab id.
   */
  selectedTabId: RightPanelPaths;
  /**
   * Callback to change the selected tab.
   */
  setSelectedTabId: (tabId: RightPanelPaths) => void;
}

const isValidTabId = (tabId: string | undefined | null): tabId is RightPanelPaths =>
  tabId != null && validTabIds.includes(tabId as RightPanelPaths);

/**
 * Hook to manage tab selection in the IOC details flyout.
 * Uses local state and localStorage for persistence.
 */
export const useTabs = ({ initialTabId }: UseTabsParams): UseTabsResult => {
  const { storage } = useKibana().services;

  const [selectedTabId, setSelectedTabIdState] = useState<RightPanelPaths>(() => {
    if (isValidTabId(initialTabId)) {
      return initialTabId;
    }

    const tabFromStorage = storage.get(FLYOUT_STORAGE_KEYS.RIGHT_PANEL_SELECTED_TABS);
    if (isValidTabId(tabFromStorage)) {
      return tabFromStorage;
    }

    return 'overview';
  });

  const setSelectedTabId = useCallback(
    (tabId: RightPanelPaths) => {
      setSelectedTabIdState(tabId);
      storage.set(FLYOUT_STORAGE_KEYS.RIGHT_PANEL_SELECTED_TABS, tabId);
    },
    [storage]
  );

  return {
    selectedTabId,
    setSelectedTabId,
  };
};
