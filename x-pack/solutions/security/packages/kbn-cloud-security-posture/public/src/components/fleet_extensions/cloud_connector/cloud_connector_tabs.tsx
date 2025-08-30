/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTab, EuiTabs, EuiSpacer } from '@elastic/eui';

export interface CloudConnectorTab {
  id: string;
  name: string;
  content: React.ReactNode;
}

export interface CloudConnectorTabsProps {
  tabs: CloudConnectorTab[];
  selectedTabId: string;
  onTabClick: (tab: CloudConnectorTab) => void;
  isEditPage: boolean;
  cloudConnectorsCount: number;
}

export const CloudConnectorTabs: React.FC<CloudConnectorTabsProps> = ({
  tabs,
  selectedTabId,
  onTabClick,
  isEditPage,
  cloudConnectorsCount,
}) => {
  const TABS = {
    NEW_CONNECTION: 'new-connection',
    EXISTING_CONNECTION: 'existing-connection',
  };

  return (
    <>
      <EuiSpacer size="m" />
      <EuiTabs>
        {tabs.map((tab) => (
          <EuiTab
            key={tab.id}
            onClick={() => {
              onTabClick(tab);
            }}
            isSelected={tab.id === selectedTabId}
            disabled={tab.id === TABS.NEW_CONNECTION ? isEditPage : !cloudConnectorsCount}
          >
            {tab.name}
          </EuiTab>
        ))}
      </EuiTabs>
      <EuiSpacer size="m" />
      {tabs.find((tab) => tab.id === selectedTabId)?.content}
    </>
  );
};
