/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useMemo } from 'react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { AttackDetailsLeftPanelKey } from '../constants/panel_keys';
import { INSIGHTS_TAB_ID, ENTITIES_TAB_ID } from '../constants/left_panel_paths';
import type { AttackDetailsLeftPanelProps } from '../types';
import { useAttackDetailsContext } from '../context';
import { PanelHeader } from './header';
import { PanelContent } from './content';
import type { LeftPanelTabType } from './tabs';
import * as tabs from './tabs';

/**
 * Left panel of the Attack Details flyout. Rendered when the user clicks "Expand details"
 * in the right panel. Uses the same attack context (attackId, indexName) as the right panel.
 * Shows Insights tab (Entities + Correlation sub-tabs) and Notes tab.
 */
export const AttackDetailsLeftPanel: FC<Partial<AttackDetailsLeftPanelProps>> = memo(({ path }) => {
  const { attackId, indexName } = useAttackDetailsContext();
  const { openLeftPanel } = useExpandableFlyoutApi();
  const { notesPrivileges } = useUserPrivileges();

  const tabsDisplayed = useMemo((): LeftPanelTabType[] => {
    const tabList: LeftPanelTabType[] = [tabs.insightsTab];
    if (notesPrivileges.read) {
      tabList.push(tabs.notesTab);
    }
    return tabList;
  }, [notesPrivileges.read]);

  const selectedTabId = useMemo(() => {
    const defaultTab = tabsDisplayed[0].id;
    if (!path?.tab) return defaultTab;
    return tabsDisplayed.map((tab) => tab.id).find((tabId) => tabId === path.tab) ?? defaultTab;
  }, [path?.tab, tabsDisplayed]);

  const setSelectedTabId = (tabId: LeftPanelTabType['id']) => {
    openLeftPanel({
      id: AttackDetailsLeftPanelKey,
      params: { attackId, indexName },
      path: {
        tab: tabId,
        ...(tabId === INSIGHTS_TAB_ID ? { subTab: ENTITIES_TAB_ID } : {}),
      },
    });
  };

  return (
    <>
      <PanelHeader
        selectedTabId={selectedTabId}
        setSelectedTabId={setSelectedTabId}
        tabs={tabsDisplayed}
      />
      <PanelContent selectedTabId={selectedTabId} tabs={tabsDisplayed} />
    </>
  );
});

AttackDetailsLeftPanel.displayName = 'AttackDetailsLeftPanel';
