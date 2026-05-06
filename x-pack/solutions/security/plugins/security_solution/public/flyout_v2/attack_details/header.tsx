/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiTab, EuiTabs } from '@elastic/eui';
import type { FC } from 'react';
import React, { memo } from 'react';
import { HeaderTitle } from './components/header_title';
import type { AttackDetailsPanelPaths, AttackDetailsPanelTabType } from './types';

export interface HeaderProps {
  /**
   * Id of the tab currently selected.
   */
  selectedTabId: AttackDetailsPanelPaths;
  /**
   * Tabs displayed below the flyout's header title.
   */
  tabs: AttackDetailsPanelTabType[];
  /**
   * Callback fired when the user selects a different tab.
   */
  setSelectedTabId: (tabId: AttackDetailsPanelPaths) => void;
  /**
   * Callback used by the header title to open the notes sub-flyout. Wired
   * by the parent so it can use the same `overlays.openSystemFlyout(<NotesDetails/>)`
   * pattern as the regular document flyout.
   */
  onShowNotes: () => void;
}

/**
 * Header section of the v2 attack details flyout. Renders the title block and
 * the tab strip; intended to be wrapped in `<EuiFlyoutHeader>` by the parent.
 */
export const Header: FC<HeaderProps> = memo(
  ({ selectedTabId, setSelectedTabId, tabs, onShowNotes }) => (
    <>
      <HeaderTitle onShowNotes={onShowNotes} />
      <EuiSpacer size="m" />
      <EuiTabs bottomBorder={false}>
        {tabs.map((tab) => (
          <EuiTab
            key={tab.id}
            onClick={() => setSelectedTabId(tab.id)}
            isSelected={tab.id === selectedTabId}
            data-test-subj={tab['data-test-subj']}
          >
            {tab.name}
          </EuiTab>
        ))}
      </EuiTabs>
    </>
  )
);

Header.displayName = 'Header';
