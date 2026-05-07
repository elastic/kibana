/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import { FLYOUT_STORAGE_KEYS } from '../../../flyout/attack_details/constants/local_storage';
import { useKibana } from '../../../common/lib/kibana';
import * as tabs from '../tabs';
import type { AttackDetailsPanelPaths, AttackDetailsPanelTabType } from '../types';

export interface UseTabsProps {
  /**
   * Callback that opens the attack-specific Entities child flyout (forwarded
   * into the Overview tab).
   */
  onShowAttackEntities: () => void;
  /**
   * Callback that opens the attack-specific Correlations child flyout
   * (forwarded into the Overview tab).
   */
  onShowAttackCorrelations: () => void;
}

export interface UseTabsResult {
  /**
   * The tabs to display in the attack details panel.
   */
  tabsDisplayed: AttackDetailsPanelTabType[];
  /**
   * The tab id currently selected in the attack details panel.
   */
  selectedTabId: AttackDetailsPanelPaths;
  /**
   * Updates the selected tab id and persists it to local storage.
   */
  setSelectedTabId: (tabId: AttackDetailsPanelPaths) => void;
}

/**
 * v2 replacement for the legacy `flyout/attack_details/hooks/use_tabs`. The
 * legacy hook resolved its initial tab from a `PanelPath` (the
 * expandable-flyout panel state); the v2 flyout has no such routing so the
 * initial tab comes from local storage and the active tab is tracked in
 * component state. The same local-storage key as the legacy hook is reused
 * intentionally: a user who switches between the legacy attack flyout (in
 * the security app) and the v2 one (in Discover) will see consistent tab
 * preferences.
 *
 * The Overview tab needs per-instance callbacks for the Insights → Entities
 * and Insights → Correlations title links — they're constructed in the
 * parent {@link AttackDetails} using `overlays.openSystemFlyout(...)` and
 * threaded into this hook so the displayed tab list rebuilds when the
 * callbacks change.
 */
export const useTabs = ({
  onShowAttackEntities,
  onShowAttackCorrelations,
}: UseTabsProps): UseTabsResult => {
  const { storage } = useKibana().services;

  const tabsDisplayed = useMemo<AttackDetailsPanelTabType[]>(
    () => [
      tabs.overviewTab({ onShowAttackEntities, onShowAttackCorrelations }),
      tabs.tableTab,
      tabs.jsonTab,
    ],
    [onShowAttackEntities, onShowAttackCorrelations]
  );

  const [selectedTabId, setSelectedTabIdState] = useState<AttackDetailsPanelPaths>(() => {
    const stored = storage.get(FLYOUT_STORAGE_KEYS.RIGHT_PANEL_SELECTED_TABS);
    const tabIds = tabsDisplayed.map((tab) => tab.id);
    if (stored && tabIds.includes(stored)) {
      return stored as AttackDetailsPanelPaths;
    }
    return tabsDisplayed[0].id;
  });

  const setSelectedTabId = useCallback(
    (tabId: AttackDetailsPanelPaths) => {
      setSelectedTabIdState(tabId);
      storage.set(FLYOUT_STORAGE_KEYS.RIGHT_PANEL_SELECTED_TABS, tabId);
    },
    [storage]
  );

  return {
    tabsDisplayed,
    selectedTabId,
    setSelectedTabId,
  };
};
