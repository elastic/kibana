/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import type { Filter } from '@kbn/es-query';
import { EuiSpacer, EuiTabs, EuiTab, EuiNotificationBadge } from '@elastic/eui';

import { useLocalStorage } from '../../../../../common/components/local_storage';
import { getSettingKey } from '../../../../../common/components/local_storage/helpers';
import {
  ATTACK_GROUP_DETAILS_CATEGORY,
  ATTACKS_PAGE,
  SELECTED_TAB_SETTING_NAME,
} from '../../constants';
import { AlertsTab } from './alerts_tab';
import { SummaryTab } from './summary_tab';
import * as i18n from './translations';

export const ATTACK_SUMMARY_TAB = 'attackSummaryTab';
export const ALERTS_TAB = 'alertsTab';

/** Test subject constant for the tabs container */
export const TABS_TEST_ID = 'tabs';

interface TabInfo {
  content: JSX.Element;
  id: string;
  name: string;
  /**
   * Places content after the tab content/children.
   */
  append?: React.ReactNode;
}

interface AttackDetailsContainerProps {
  /** The attack discovery alert document. If undefined, only the Alerts tab will be shown. */
  attack?: AttackDiscoveryAlert;
  /** Whether to show anonymized values instead of replacements */
  showAnonymized?: boolean;
  /** Filters applied from grouping */
  groupingFilters: Filter[];
  /** Default filters to apply to the alerts table */
  defaultFilters: Filter[];
  /** Whether the alerts table is in a loading state */
  isTableLoading: boolean;
}

/**
 * Main component that provides a container interface for viewing attack summary
 * and associated alerts when an attack group is selected in the attacks table.
 * Manages tab selection state and resets to first tab when the attack changes.
 * If attack is undefined, only the Alerts tab will be rendered.
 */
export const AttackDetailsContainer = React.memo<AttackDetailsContainerProps>(
  ({ attack, groupingFilters, defaultFilters, isTableLoading, showAnonymized }) => {
    const [selectedTabId, setSelectedTabId] = useLocalStorage<string>({
      defaultValue: ATTACK_SUMMARY_TAB,
      key: getSettingKey({
        page: ATTACKS_PAGE,
        category: ATTACK_GROUP_DETAILS_CATEGORY,
        setting: SELECTED_TAB_SETTING_NAME,
      }),
    });

    const tabs = useMemo<TabInfo[]>(() => {
      const tabsList: TabInfo[] = [];

      if (attack) {
        tabsList.push({
          id: ATTACK_SUMMARY_TAB,
          name: i18n.ATTACK_SUMMARY,
          content: (
            <>
              <EuiSpacer size="s" />
              <SummaryTab attack={attack} showAnonymized={showAnonymized} />
            </>
          ),
        });
      }

      tabsList.push({
        id: ALERTS_TAB,
        name: i18n.ALERTS,
        content: (
          <>
            <EuiSpacer size="s" />
            <AlertsTab
              groupingFilters={groupingFilters}
              defaultFilters={defaultFilters}
              isTableLoading={isTableLoading}
            />
          </>
        ),
        append: attack ? (
          <EuiNotificationBadge size="m" color="subdued">
            {attack.alertIds.length}
          </EuiNotificationBadge>
        ) : undefined,
      });

      return tabsList;
    }, [attack, groupingFilters, defaultFilters, isTableLoading, showAnonymized]);

    const selectedTabContent = useMemo(() => {
      let content = tabs.find((obj) => obj.id === selectedTabId)?.content;
      if (!content && tabs.length > 0) {
        // Fallback to the existing tab if selectedTabId points to the tab that does not exist for the attack group.
        // This can happen for the default group shown as "-" and representing the alerts that are not part of any attack.
        // This will change once we have a "Summary tab" for the generic group as well.
        content = tabs[0].content;
      }
      return content;
    }, [selectedTabId, tabs]);

    return (
      <>
        <EuiTabs data-test-subj={TABS_TEST_ID}>
          {tabs.map((tab, index) => (
            <EuiTab
              key={index}
              isSelected={tab.id === selectedTabId}
              onClick={() => setSelectedTabId(tab.id)}
              append={tab.append}
            >
              {tab.name}
            </EuiTab>
          ))}
        </EuiTabs>
        {selectedTabContent}
      </>
    );
  }
);
AttackDetailsContainer.displayName = 'AttackDetailsContainer';
