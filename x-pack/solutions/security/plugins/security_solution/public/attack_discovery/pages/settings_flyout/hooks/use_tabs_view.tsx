/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiTabbedContent,
  EuiFlexGroup,
  EuiFlexItem,
  type EuiTabbedContentProps,
  type EuiTabbedContentTab,
  EuiSpacer,
} from '@elastic/eui';
import * as i18n from './translations';
import { useSettingsView } from './use_settings_view';
import type { FilterSettings } from '../types';
import { Schedule } from '../schedule';

/*
 * Fixes tabs to the top and allows the content to scroll.
 */
const ScrollableFlyoutTabbedContent = (props: EuiTabbedContentProps) => (
  <EuiFlexGroup direction="column" gutterSize="none">
    <EuiFlexItem grow={true}>
      <EuiTabbedContent {...props} />
    </EuiFlexItem>
  </EuiFlexGroup>
);

export interface UseTabsView {
  tabsContainer: React.ReactNode;
  actionButtons?: React.ReactNode;
}

interface Props {
  filterSettings: FilterSettings;
}

export const useTabsView = ({ filterSettings }: Props): UseTabsView => {
  const { settingsView, actionButtons: filterActionButtons } = useSettingsView({
    filterSettings,
  });

  const settingsTab: EuiTabbedContentTab = useMemo(
    () => ({
      id: 'settings',
      name: i18n.SETTINGS_TAB_LABEL,
      content: (
        <>
          <EuiSpacer size="m" />
          {settingsView}
        </>
      ),
    }),
    [settingsView]
  );

  const scheduleTab: EuiTabbedContentTab = useMemo(
    () => ({
      id: 'schedule',
      name: i18n.SCHEDULE_TAB_LABEL,
      content: (
        <>
          <EuiSpacer size="m" />
          <Schedule />
        </>
      ),
    }),
    []
  );

  const tabs = useMemo(() => {
    return [settingsTab, scheduleTab];
  }, [scheduleTab, settingsTab]);

  const [selectedTabId, setSelectedTabId] = useState<string>(tabs[0].id);
  const selectedTab = tabs.find((tab) => tab.id === selectedTabId) ?? tabs[0];

  useEffect(() => {
    if (!tabs.find((tab) => tab.id === selectedTabId)) {
      // Switch to first tab if currently selected tab is not available for this rule
      setSelectedTabId(tabs[0].id);
    }
  }, [tabs, selectedTabId]);

  const onTabClick = (tab: EuiTabbedContentTab) => {
    setSelectedTabId(tab.id);
  };

  const tabsContainer = useMemo(() => {
    return (
      <ScrollableFlyoutTabbedContent
        tabs={tabs}
        selectedTab={selectedTab}
        onTabClick={onTabClick}
      />
    );
  }, [selectedTab, tabs]);

  const actionButtons = useMemo(
    () => (selectedTabId === 'settings' ? filterActionButtons : undefined),
    [filterActionButtons, selectedTabId]
  );

  return { tabsContainer, actionButtons };
};
