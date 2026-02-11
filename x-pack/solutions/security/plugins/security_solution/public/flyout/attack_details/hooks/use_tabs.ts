/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { PanelPath } from '@kbn/expandable-flyout';
import type { AttackDetailsPanelPaths } from '..';

import * as tabs from '../tabs';
import type { AttackDetailsPanelTabType } from '../tabs';
import { useKibana } from '../../../common/lib/kibana';
import { FLYOUT_STORAGE_KEYS } from '../constants/local_storage';

export const tabsDisplayed = [tabs.overviewTab, tabs.tableTab, tabs.jsonTab];

export interface UseTabsParams {
  /**
   * The path passed in when using the expandable flyout API to open a panel.
   */
  path: PanelPath | undefined;
}

export interface UseTabsResult {
  /**
   * The tabs to display in the attack details panel.
   */
  tabsDisplayed: AttackDetailsPanelTabType[];
  /**
   * The tab id to selected in the attack details panel.
   */
  selectedTabId: AttackDetailsPanelPaths;
}

/**
 * Hook to get the tabs to display in the attack details panel and the selected tab.
 */
export const useTabs = ({ path }: UseTabsParams): UseTabsResult => {
  const { storage } = useKibana().services;

  const selectedTabId = useMemo(() => {
    // we use the value passed from the url and use it if it exists in the list of tabs to display
    if (path) {
      const selectedTab = tabsDisplayed.map((tab) => tab.id).find((tabId) => tabId === path.tab);
      if (selectedTab) {
        return selectedTab;
      }
    }

    // we check the tab saved in local storage and use it if it exists in the list of tabs to display
    const tabSavedInLocalStorage = storage.get(FLYOUT_STORAGE_KEYS.RIGHT_PANEL_SELECTED_TABS);
    const savedTabExists =
      tabSavedInLocalStorage && tabsDisplayed.map((tab) => tab.id).includes(tabSavedInLocalStorage);
    if (savedTabExists) {
      return tabSavedInLocalStorage;
    }

    const defaultTab = tabsDisplayed[0].id;
    return defaultTab;
  }, [path, storage]);

  return {
    tabsDisplayed,
    selectedTabId,
  };
};
