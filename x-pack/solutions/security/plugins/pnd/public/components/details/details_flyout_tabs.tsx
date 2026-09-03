/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTab, EuiTabs, EuiTitle } from '@elastic/eui';
import { EuiTextTruncate } from '@elastic/eui';
import { DETAILS_FLYOUT_LABELS } from './translations';
import type { FlyoutTab } from './details_flyout_tab_contents';

export interface ConversationDetailsFlyoutHeaderProps {
  correlationId: string;
  onTabChange: (tab: FlyoutTab) => void;
  selectedTab: FlyoutTab;
}

const TABS: Array<{ id: FlyoutTab; label: string }> = [
  { id: 'attachments', label: DETAILS_FLYOUT_LABELS.tabs.attachments },
  { id: 'overview', label: DETAILS_FLYOUT_LABELS.tabs.overview },
  { id: 'timeline', label: DETAILS_FLYOUT_LABELS.tabs.timeline },
];

export const ConversationDetailsFlyoutTabs = memo<ConversationDetailsFlyoutHeaderProps>(
  ({ correlationId, onTabChange, selectedTab }) => {
    return (
      <>
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem>
            <EuiTitle size="s">
              <h2>
                <EuiTextTruncate text={correlationId} />
              </h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <EuiTabs bottomBorder size="m">
          {TABS.map(({ id, label }) => (
            <EuiTab isSelected={selectedTab === id} key={id} onClick={() => onTabChange(id)}>
              {label}
            </EuiTab>
          ))}
        </EuiTabs>
        <EuiSpacer size="m" />
      </>
    );
  }
);

ConversationDetailsFlyoutTabs.displayName = 'ConversationDetailsFlyoutTabs';
