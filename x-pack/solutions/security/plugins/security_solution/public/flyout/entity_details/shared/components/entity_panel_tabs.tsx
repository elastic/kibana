/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement, FC } from 'react';
import React, { memo } from 'react';
import { EuiTab, EuiTabs } from '@elastic/eui';

export interface EntityPanelTabType {
  id: string;
  name: ReactElement;
  'data-test-subj': string;
}

interface EntityPanelHeaderTabsProps {
  tabs: EntityPanelTabType[];
  selectedTabId: string;
  setSelectedTabId: (id: string) => void;
}

export const EntityPanelHeaderTabs: FC<EntityPanelHeaderTabsProps> = memo(
  ({ tabs, selectedTabId, setSelectedTabId }) => {
    return (
      <EuiTabs size="l" expand>
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
    );
  }
);

EntityPanelHeaderTabs.displayName = 'EntityPanelHeaderTabs';
