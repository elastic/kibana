/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { PanelPath } from '@kbn/expandable-flyout';
import type { RightPanelPaths } from '../../../flyout_v2/ioc/main/tabs';
import { useKibana } from '../../../common/lib/kibana';
import { FLYOUT_STORAGE_KEYS } from '../../../flyout_v2/ioc/main/constants/local_storage';

const validTabIds: RightPanelPaths[] = ['overview', 'table', 'json'];

export interface UseTabsParams {
  /**
   * The path passed in when using the expandable flyout API to open a panel.
   */
  path: PanelPath | undefined;
}

export interface UseTabsResult {
  /**
   * The tab id to selected in the right panel.
   */
  selectedTabId: RightPanelPaths;
}

/**
 * Hook to get the selected tab in the expandable flyout right panel.
 * Reads from the flyout path, then localStorage, then defaults to overview.
 */
export const useTabs = ({ path }: UseTabsParams): UseTabsResult => {
  const { storage } = useKibana().services;

  const selectedTabId = useMemo(() => {
    if (path) {
      const selectedTab = validTabIds.find((tabId) => tabId === path.tab);
      if (selectedTab) {
        return selectedTab;
      }
    }

    const tabSavedInLocalStorage = storage.get(FLYOUT_STORAGE_KEYS.RIGHT_PANEL_SELECTED_TABS);
    if (tabSavedInLocalStorage && validTabIds.includes(tabSavedInLocalStorage as RightPanelPaths)) {
      return tabSavedInLocalStorage as RightPanelPaths;
    }

    return 'overview' as const;
  }, [path, storage]);

  return {
    selectedTabId,
  };
};
