/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
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
  /** The attack discovery alert document. */
  attack: AttackDiscoveryAlert;
  /** Whether to show anonymized values instead of replacements */
  showAnonymized?: boolean;
  /** Filters applied from grouping */
  groupingFilters: Filter[];
  /** Default filters to apply to the alerts table */
  defaultFilters: Filter[];
  /** Whether the alerts table is in a loading state */
  isTableLoading: boolean;
  /** The count of related alerts after all filters applied */
  filteredAlertsCount: number;
}

/**
 * Main component that provides a container interface for viewing attack summary
 * and associated alerts when an attack group is selected in the attacks table.
 * Manages tab selection state and resets to first tab when the attack changes.
 * If attack is undefined, only the Alerts tab will be rendered.
 */
export const AttackDetailsContainer = React.memo<AttackDetailsContainerProps>(
  ({
    attack,
    groupingFilters,
    defaultFilters,
    isTableLoading,
    showAnonymized,
    filteredAlertsCount,
  }) => {
    const [selectedTabId, setSelectedTabId] = useLocalStorage<string>({
      defaultValue: ATTACK_SUMMARY_TAB,
      key: getSettingKey({
        page: ATTACKS_PAGE,
        category: ATTACK_GROUP_DETAILS_CATEGORY,
        setting: SELECTED_TAB_SETTING_NAME,
      }),
    });

    const tabs = useMemo<TabInfo[]>(
      () => [
        {
          id: ATTACK_SUMMARY_TAB,
          name: i18n.ATTACK_SUMMARY,
          content: (
            <>
              <EuiSpacer size="s" />
              <SummaryTab attack={attack} showAnonymized={showAnonymized} />
            </>
          ),
        },
        {
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
              {`${filteredAlertsCount}/${attack.alertIds.length}`}
            </EuiNotificationBadge>
          ) : undefined,
        },
      ],
      [attack, showAnonymized, groupingFilters, defaultFilters, isTableLoading, filteredAlertsCount]
    );

    const selectedTabContent = useMemo(() => {
      return tabs.find((obj) => obj.id === selectedTabId)?.content;
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
