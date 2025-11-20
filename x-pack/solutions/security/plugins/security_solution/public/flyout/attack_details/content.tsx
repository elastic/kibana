/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useMemo } from 'react';
import { EuiTab, EuiTabs } from '@elastic/eui';
import type { AttackDetailsPanelTabType } from './tabs';
import { FlyoutBody } from '../shared/components/flyout_body';

import type { AttackDetailsPanelPaths } from '.';
import { FLYOUT_BODY_TEST_ID } from './constants/test_id';
import { FlexGroup, FlexItem } from '../../explore/components/stat_items/utils';

export interface PanelContentProps {
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

/**
 * Attack details expandable flyout section, that will display the content
 * of the overview, table and json tabs.
 */
export const PanelContent: FC<PanelContentProps> = memo(
  ({ selectedTabId, tabs, setSelectedTabId }) => {
    const selectedTabContent = useMemo(
      () => tabs.find((tab) => tab.id === selectedTabId)?.content,
      [selectedTabId, tabs]
    );

    const onSelectedTabChanged = (id: AttackDetailsPanelPaths) => setSelectedTabId(id);

    return (
      <FlyoutBody data-test-subj={FLYOUT_BODY_TEST_ID}>
        <FlexGroup>
          <FlexItem>
            <EuiTabs size="l" expand>
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
            </EuiTabs>
          </FlexItem>
        </FlexGroup>

        {selectedTabContent}
      </FlyoutBody>
    );
  }
);

PanelContent.displayName = 'PanelContent';
