/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTab, EuiTabs, useEuiTheme } from '@elastic/eui';
import type { FC } from 'react';
import React, { memo } from 'react';
import { css } from '@emotion/react';
import type { LeftPanelPaths } from '../constants/left_panel_paths';
import { FlyoutHeader } from '../../shared/components/flyout_header';
import type { LeftPanelTabType } from './tabs';

export interface PanelHeaderProps {
  /**
   * Id of the tab selected in the parent component
   */
  selectedTabId: LeftPanelPaths;
  /**
   * Callback to set the selected tab id
   */
  setSelectedTabId: (selected: LeftPanelPaths) => void;
  /**
   * Tabs to display at the top of the left panel
   */
  tabs: LeftPanelTabType[];
}

/**
 * Header at the top of the Attack Details left panel.
 * Displays the Insights and Notes tabs.
 */
export const PanelHeader: FC<PanelHeaderProps> = memo(
  ({ selectedTabId, setSelectedTabId, tabs }) => {
    const { euiTheme } = useEuiTheme();

    const renderTabs = tabs.map((tab, index) => (
      <EuiTab
        onClick={() => setSelectedTabId(tab.id)}
        isSelected={tab.id === selectedTabId}
        key={index}
        data-test-subj={tab['data-test-subj']}
      >
        {tab.name}
      </EuiTab>
    ));

    return (
      <FlyoutHeader
        css={css`
          background-color: ${euiTheme.colors.backgroundBaseSubdued};
          padding-bottom: 0 !important;
          border-block-end: none !important;
        `}
      >
        <EuiTabs size="l">{renderTabs}</EuiTabs>
      </FlyoutHeader>
    );
  }
);

PanelHeader.displayName = 'PanelHeader';
