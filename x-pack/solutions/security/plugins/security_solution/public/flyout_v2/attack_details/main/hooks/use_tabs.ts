/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import type { BrowserFields, TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import { FLYOUT_STORAGE_KEYS } from '../constants/local_storage';
import { useKibana } from '../../../../common/lib/kibana';
import * as tabs from '../tabs';
import type { AttackDetailsPanelPaths, AttackDetailsPanelTabType } from '../types';

export interface UseTabsProps {
  /**
   * The attack-discovery document hit forwarded to every tab.
   */
  hit: DataTableRecord;
  /**
   * Parsed attack-discovery alert resolved by {@link useAttackDetails};
   * forwarded into the Overview tab so the AI Summary section can source the
   * markdown bodies from the alert rather than from `hit.flattened` (which
   * is unreliable across entry points).
   */
  attack: AttackDiscoveryAlert;
  /**
   * Browser fields resolved by {@link useAttackDetails}; needed by the Table
   * tab's column renderers.
   */
  browserFields: BrowserFields;
  /**
   * Field-browser-friendly representation of the event needed by the Table
   * tab to render one row per field.
   */
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[];
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
 * intentionally so users see consistent tab preferences across surfaces.
 *
 * Each tab is built via its factory so it can receive `hit` (and, for the
 * Overview tab, the two child-flyout callbacks; for the Table tab, the
 * resolved browser fields).
 */
export const useTabs = ({
  hit,
  attack,
  browserFields,
  dataFormattedForFieldBrowser,
  onShowAttackEntities,
  onShowAttackCorrelations,
}: UseTabsProps): UseTabsResult => {
  const { storage } = useKibana().services;

  const tabsDisplayed = useMemo<AttackDetailsPanelTabType[]>(
    () => [
      tabs.overviewTab({ hit, attack, onShowAttackEntities, onShowAttackCorrelations }),
      tabs.tableTab({ hit, browserFields, dataFormattedForFieldBrowser }),
      tabs.jsonTab({ hit }),
    ],
    [
      attack,
      browserFields,
      dataFormattedForFieldBrowser,
      hit,
      onShowAttackCorrelations,
      onShowAttackEntities,
    ]
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
