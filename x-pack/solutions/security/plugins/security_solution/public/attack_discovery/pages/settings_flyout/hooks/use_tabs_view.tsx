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
import type { AttackDiscoveryStats } from '@kbn/elastic-assistant-common';
import { css } from '@emotion/react';

import { SCHEDULE_TAB_ID, SETTINGS_TAB_ID } from '../constants';
import type { SettingsOverrideOptions } from '../../results/history/types';
import * as i18n from './translations';
import type { AlertsSelectionSettings } from '../types';
import { useSettingsView } from './use_settings_view';
import { useScheduleView } from './use_schedule_view';

const SETTINGS_TAB_CLASS = 'settingsTab';

// We're hiding the tabs in the flyout to accommodate a late-breaking design change.
// Per a team agreement, the tabs will be refactored out in a future PR.
const hiddenTabsStyles = css`
  &.${SETTINGS_TAB_CLASS} > .euiTabs {
    display: none;
  }
  &.${SETTINGS_TAB_CLASS} .euiTabs .euiSpacer {
    display: none;
  }
  /* Hide spacers that are direct children of tab panels to clean up the layout */
  div[role='tabpanel'] > .euiSpacer {
    display: none;
  }
`;

/*
 * Fixes tabs to the top and allows the content to scroll.
 */
const ScrollableFlyoutTabbedContent = (props: EuiTabbedContentProps) => (
  <EuiFlexGroup direction="column" gutterSize="none">
    <EuiFlexItem grow={true}>
      <EuiTabbedContent {...props} className={SETTINGS_TAB_CLASS} css={hiddenTabsStyles} />
    </EuiFlexItem>
  </EuiFlexGroup>
);

export interface UseTabsView {
  tabsContainer: React.ReactNode;
  actionButtons?: React.ReactNode;
}

interface Props {
  connectorId: string | undefined;
  defaultSelectedTabId?: string;
  onConnectorIdSelected: (connectorId: string) => void;
  onGenerate: (overrideOptions?: SettingsOverrideOptions) => Promise<void>;
  onSettingsChanged?: (settings: AlertsSelectionSettings) => void;
  onSettingsReset?: () => void;
  onSettingsSave?: () => void;
  settings: AlertsSelectionSettings;
  stats: AttackDiscoveryStats | null;
}

export const useTabsView = ({
  connectorId,
  defaultSelectedTabId,
  onConnectorIdSelected,
  onGenerate,
  onSettingsReset,
  onSettingsSave,
  onSettingsChanged,
  settings,
  stats,
}: Props): UseTabsView => {
  const { settingsView, actionButtons: filterActionButtons } = useSettingsView({
    connectorId,
    onConnectorIdSelected,
    onGenerate,
    onSettingsReset,
    onSettingsSave,
    onSettingsChanged,
    settings,
    showConnectorSelector: true,
    stats,
  });
  const { scheduleView, actionButtons: scheduleTabButtons } = useScheduleView();

  const settingsTab: EuiTabbedContentTab = useMemo(
    () => ({
      id: SETTINGS_TAB_ID,
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
      id: SCHEDULE_TAB_ID,
      name: i18n.SCHEDULE_TAB_LABEL,
      content: (
        <>
          <EuiSpacer size="m" />
          {scheduleView}
        </>
      ),
    }),
    [scheduleView]
  );

  const tabs = useMemo(() => {
    return [settingsTab, scheduleTab];
  }, [scheduleTab, settingsTab]);

  const [selectedTabId, setSelectedTabId] = useState<string>(defaultSelectedTabId ?? tabs[0].id);
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
    () => (selectedTabId === 'settings' ? filterActionButtons : scheduleTabButtons),
    [filterActionButtons, scheduleTabButtons, selectedTabId]
  );

  return { tabsContainer, actionButtons };
};
