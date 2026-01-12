/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiFlyoutHeader } from '@elastic/eui';
import { EuiSpacer, EuiTab } from '@elastic/eui';
import type { FC } from 'react';
import React, { memo, useCallback } from 'react';
import type { AttackDetailsPanelPaths } from '.';
import type { AttackDetailsPanelTabType } from './tabs';
import { FlyoutHeader } from '../shared/components/flyout_header';
import { FlyoutHeaderTabs } from '../shared/components/flyout_header_tabs';
import { HeaderTitle } from './components/header_title';

export interface PanelHeaderProps extends React.ComponentProps<typeof EuiFlyoutHeader> {
  /**
   * Id of the tab selected in the parent component to display its content
   */
  selectedTabId: AttackDetailsPanelPaths;
  /**
   * Tabs display below the flyout's header
   */
  tabs: AttackDetailsPanelTabType[];
  /**
   * Callback to set the selected tab id in the parent component
   * @param selected
   */
  setSelectedTabId: (selected: AttackDetailsPanelPaths) => void;
}

export const PanelHeader: FC<PanelHeaderProps> = memo(
  ({ selectedTabId, setSelectedTabId, tabs, ...flyoutHeaderProps }) => {
    const onSelectedTabChanged = useCallback(
      (id: AttackDetailsPanelPaths) => setSelectedTabId(id),
      [setSelectedTabId]
    );

    return (
      <FlyoutHeader {...flyoutHeaderProps}>
        <HeaderTitle />
        <EuiSpacer size="m" />
        <FlyoutHeaderTabs>
          {tabs.map((tab, index) => (
            <EuiTab
              onClick={() => onSelectedTabChanged(tab.id)}
              isSelected={tab.id === selectedTabId}
              key={index}
              data-test-subj={tab['data-test-subj']}
            >
              {tab.name}
            </EuiTab>
          ))}
        </FlyoutHeaderTabs>
      </FlyoutHeader>
    );
  }
);

PanelHeader.displayName = 'PanelHeader';
