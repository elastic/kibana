/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiTab, EuiTabs, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { FC } from 'react';
import React, { memo } from 'react';
import type { BrowserFields, TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import { HeaderTitle } from './components/header_title';
import type { AttackDetailsPanelPaths, AttackDetailsPanelTabType } from './types';

export interface HeaderProps {
  /**
   * Parsed attack-discovery alert resolved by {@link useAttackDetails}.
   * Forwarded to {@link HeaderTitle}.
   */
  attack: AttackDiscoveryAlert;
  /**
   * Browser fields used by the Status block inside the header title.
   */
  browserFields: BrowserFields;
  /**
   * Field-browser-friendly representation of the event used by the Status
   * block.
   */
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[];
  /**
   * Refetch callback forwarded to the Status / Assignees children so the
   * header updates after mutations.
   */
  refetch: () => Promise<void>;
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
  ({
    attack,
    browserFields,
    dataFormattedForFieldBrowser,
    refetch,
    selectedTabId,
    setSelectedTabId,
    tabs,
    onShowNotes,
  }) => {
    const { euiTheme } = useEuiTheme();
    // Pull the tab strip down by `EuiFlyoutHeader`'s built-in
    // `padding-block-end` (16px from the parent flyout's `paddingSize: 'm'`)
    // so the active-tab underline coincides with the header's bottom border —
    // matching the legacy `FlyoutHeaderTabs` `margin-bottom: -17px` trick
    // (legacy needed an extra px to compensate for its inner `EuiPanel`
    // padding; v2 has no inner panel, so `-${size.base}` is enough).
    const tabsCss = css`
      margin-block-end: -${euiTheme.size.base};
    `;
    return (
      <>
        <HeaderTitle
          attack={attack}
          browserFields={browserFields}
          dataFormattedForFieldBrowser={dataFormattedForFieldBrowser}
          refetch={refetch}
          onShowNotes={onShowNotes}
        />
        <EuiSpacer size="m" />
        <EuiTabs bottomBorder={false} expand css={tabsCss}>
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
    );
  }
);

Header.displayName = 'Header';
