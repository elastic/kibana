/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTabbedContent, type EuiTabbedContentTab } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { VisibilityTabId } from './visibility_section_boxes';
import { CoverageTab } from './tabs/coverage_tab/coverage_tab';
import { QualityTab } from './tabs/quality/quality_tab';
import { ContinuityTab } from './tabs/continuity/continuity_tab';
import { RetentionTab } from './tabs/retention/retention_tab';

interface VisibilitySectionTabsProps {
  selectedTabId: VisibilityTabId;
  onTabSelect: (tabId: VisibilityTabId) => void;
}

export const VisibilitySectionTabs: React.FC<VisibilitySectionTabsProps> = ({
  selectedTabId,
  onTabSelect,
}) => {
  const tabs: EuiTabbedContentTab[] = [
    {
      id: 'coverage',
      name: i18n.translate('xpack.securitySolution.siemReadiness.visibility.coverage.tab.title', {
        defaultMessage: 'Coverage',
      }),
      content: <CoverageTab />,
    },
    {
      id: 'quality',
      name: i18n.translate('xpack.securitySolution.siemReadiness.visibility.quality.tab.title', {
        defaultMessage: 'Quality',
      }),
      content: <QualityTab />,
    },
    {
      id: 'continuity',
      name: i18n.translate('xpack.securitySolution.siemReadiness.visibility.continuity.tab.title', {
        defaultMessage: 'Continuity',
      }),
      content: <ContinuityTab />,
    },
    {
      id: 'retention',
      name: i18n.translate('xpack.securitySolution.siemReadiness.visibility.retention.tab.title', {
        defaultMessage: 'Retention',
      }),
      content: <RetentionTab />,
    },
  ];

  const selectedTab = tabs.find((tab) => tab.id === selectedTabId) || tabs[0];

  return (
    <EuiTabbedContent
      tabs={tabs}
      selectedTab={selectedTab}
      onTabClick={(tab) => onTabSelect(tab.id as VisibilityTabId)}
    />
  );
};

VisibilitySectionTabs.displayName = 'VisibilitySectionTabs';
