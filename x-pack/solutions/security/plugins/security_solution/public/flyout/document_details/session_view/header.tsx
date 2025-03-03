/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiFlyoutHeader } from '@elastic/eui';
import { EuiTab } from '@elastic/eui';
import type { FC } from 'react';
import React, { memo } from 'react';
import type { SessionViewPanelTabType } from './tabs';
import type { SessionViewPanelPaths } from '.';
import { FlyoutHeader } from '../../shared/components/flyout_header';
import { FlyoutHeaderTabs } from '../../shared/components/flyout_header_tabs';

export interface PanelHeaderProps extends React.ComponentProps<typeof EuiFlyoutHeader> {
  /**
   * Id of the tab selected in the parent component to display its content
   */
  selectedTabId: SessionViewPanelPaths;
  /**
   * Callback to set the selected tab id in the parent component
   * @param selected
   */
  setSelectedTabId: (selected: SessionViewPanelPaths) => void;
  /**
   * Tabs to display in the header
   */
  tabs: SessionViewPanelTabType[];
}

/**
 * Renders the process, metadata and alerts tabs in the SessionView preview panel header.
 */
export const PanelHeader: FC<PanelHeaderProps> = memo(
  ({ selectedTabId, setSelectedTabId, tabs, ...flyoutHeaderProps }) => {
    const onSelectedTabChanged = (id: SessionViewPanelPaths) => setSelectedTabId(id);

    const renderTabs = tabs.map((tab, index) => (
      <EuiTab
        onClick={() => onSelectedTabChanged(tab.id)}
        isSelected={tab.id === selectedTabId}
        key={index}
        data-test-subj={tab['data-test-subj']}
      >
        {tab.name}
      </EuiTab>
    ));

    return (
      <FlyoutHeader {...flyoutHeaderProps}>
        <FlyoutHeaderTabs>{renderTabs}</FlyoutHeaderTabs>
      </FlyoutHeader>
    );
  }
);

PanelHeader.displayName = 'PanelHeader';
