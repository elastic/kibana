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
}

/**
 * Main component that provides a container interface for viewing attack summary
 * and associated alerts when an attack group is selected in the attacks table.
 * Manages tab selection state and resets to first tab when the attack changes.
 * If attack is undefined, only the Alerts tab will be rendered.
 */
export const AttackDetailsContainer = React.memo<AttackDetailsContainerProps>(
  ({ attack, groupingFilters, defaultFilters, isTableLoading, showAnonymized }) => {
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
              {attack.alertIds.length}
            </EuiNotificationBadge>
          ) : undefined,
        },
      ],
      [attack, groupingFilters, defaultFilters, isTableLoading, showAnonymized]
    );

    const firstTabId = useMemo(() => (attack ? ATTACK_SUMMARY_TAB : ALERTS_TAB), [attack]);

    const [selectedTabId, setSelectedTabId] = useState(firstTabId);

    const selectedTabContent = useMemo(() => {
      return tabs.find((obj) => obj.id === selectedTabId)?.content;
    }, [selectedTabId, tabs]);

    const onSelectedTabChanged = useCallback((id: string) => setSelectedTabId(id), []);

    useEffect(() => {
      // Reset to the first tab if the attack changes,
      // because (for example) the workflow status of the alerts may have changed:
      setSelectedTabId(firstTabId);
    }, [attack, firstTabId]);

    return (
      <>
        <EuiTabs data-test-subj={TABS_TEST_ID}>
          {tabs.map((tab, index) => (
            <EuiTab
              key={index}
              isSelected={tab.id === selectedTabId}
              onClick={() => onSelectedTabChanged(tab.id)}
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
