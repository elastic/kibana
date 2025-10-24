/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useMemo } from 'react';

import { useFlyoutApi } from '@kbn/flyout';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { DocumentDetailsLeftPanelKeyV2 } from '../shared/constants/panel_keys';
import { PanelHeader } from './header';
import { PanelContent } from './content';
import type { LeftPanelTabType } from './tabs';
import * as tabs from './tabs';
import { getField } from '../shared/utils';
import { EventKind } from '../shared/constants/event_kinds';
import { useDocumentDetailsContext } from '../shared/context';
import type { DocumentDetailsProps } from '../shared/types';

export type LeftPanelPaths = 'insights' | 'investigation' | 'response' | 'notes';
export const LeftPanelInsightsTab: LeftPanelPaths = 'insights';
export const LeftPanelInvestigationTab: LeftPanelPaths = 'investigation';
export const LeftPanelResponseTab: LeftPanelPaths = 'response';
export const LeftPanelNotesTab: LeftPanelPaths = 'notes';

export const LeftPanel: FC<Partial<DocumentDetailsProps>> = memo(({ path }) => {
  const { openChildPanel } = useFlyoutApi();
  const { eventId, indexName, scopeId, getFieldsData, isRulePreview } = useDocumentDetailsContext();
  const eventKind = getField(getFieldsData('event.kind'));
  const {
    notesPrivileges: { read: canSeeNotes },
  } = useUserPrivileges();

  const tabsDisplayed = useMemo(() => {
    const tabList =
      eventKind === EventKind.signal
        ? [tabs.insightsTab, tabs.investigationTab, tabs.responseTab]
        : [tabs.insightsTab];
    if (canSeeNotes && !isRulePreview) {
      tabList.push(tabs.notesTab);
    }
    return tabList;
  }, [eventKind, isRulePreview, canSeeNotes]);

  const selectedTabId = useMemo(() => {
    const defaultTab = tabsDisplayed[0].id;
    if (!path) return defaultTab;
    return tabsDisplayed.map((tab) => tab.id).find((tabId) => tabId === path.tab) ?? defaultTab;
  }, [path, tabsDisplayed]);

  const setSelectedTabId = (tabId: LeftPanelTabType['id']) => {
    openChildPanel({
      id: DocumentDetailsLeftPanelKeyV2,
      path: {
        tab: tabId,
      },
      params: {
        id: eventId,
        indexName,
        scopeId,
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

LeftPanel.displayName = 'LeftPanel';
