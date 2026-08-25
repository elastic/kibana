/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { Investigation } from '@kbn/pnd-common';
import { CriticalityBadge } from './criticality_badge';
import { DETAILS_FLYOUT_LABELS as i18n } from './translations';
import type { FlyoutTab } from './details_flyout_tab_contents';

export interface ConversationDetailsFlyoutHeaderProps {
  investigation: Investigation;
  selectedTab: FlyoutTab;
  onTabChange: (tab: FlyoutTab) => void;
}

const TABS: Array<{ id: FlyoutTab; label: string }> = [
  { id: 'overview', label: i18n.tabs.overview },
  { id: 'attachments', label: i18n.tabs.attachments },
  { id: 'timeline', label: i18n.tabs.timeline },
];

const formatSince = (isoTimestamp: string): string => {
  const date = new Date(isoTimestamp);
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const minutesAgo = Math.round((Date.now() - date.getTime()) / 60000);
  return `Since ${time} (${minutesAgo} min)`;
};

export const ConversationDetailsFlyoutTabs = memo<ConversationDetailsFlyoutHeaderProps>(
  ({ investigation: { title, priorityScore, createdAt }, selectedTab, onTabChange }) => {
    return (
      <>
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem>
            <EuiTitle size="s">
              <h2>{title}</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup direction="row" gutterSize="s" alignItems="center" responsive={false}>
              {priorityScore != null && (
                <EuiFlexItem grow={false}>
                  <CriticalityBadge priorityScore={priorityScore} />
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  <span>{formatSince(createdAt)}</span>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <EuiTabs size="m" bottomBorder>
          {TABS.map(({ id, label }) => (
            <EuiTab key={id} isSelected={selectedTab === id} onClick={() => onTabChange(id)}>
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
