/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTabbedContent, EuiText, EuiSpacer, type EuiTabbedContentTab } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { VisibilityTabId } from './visibility_section_boxes';

interface VisibilitySectionTabsProps {
  selectedTabId: VisibilityTabId;
  onTabSelect: (tabId: VisibilityTabId) => void;
}

const CoverageTabContent: React.FC = () => {
  return (
    <>
      <EuiSpacer size="m" />
      <EuiText>
        <p>
          {i18n.translate(
            'xpack.securitySolution.siemReadiness.visibility.coverage.tab.placeholder',
            {
              defaultMessage: 'Coverage tab content will be implemented here.',
            }
          )}
        </p>
      </EuiText>
    </>
  );
};

const QualityTabContent: React.FC = () => {
  return (
    <>
      <EuiSpacer size="m" />
      <EuiText>
        <p>
          {i18n.translate(
            'xpack.securitySolution.siemReadiness.visibility.quality.tab.placeholder',
            {
              defaultMessage: 'Quality tab content will be implemented here.',
            }
          )}
        </p>
      </EuiText>
    </>
  );
};

const ContinuityTabContent: React.FC = () => {
  return (
    <>
      <EuiSpacer size="m" />
      <EuiText>
        <p>
          {i18n.translate(
            'xpack.securitySolution.siemReadiness.visibility.continuity.tab.placeholder',
            {
              defaultMessage: 'Continuity tab content will be implemented here.',
            }
          )}
        </p>
      </EuiText>
    </>
  );
};

const RetentionTabContent: React.FC = () => {
  return (
    <>
      <EuiSpacer size="m" />
      <EuiText>
        <p>
          {i18n.translate(
            'xpack.securitySolution.siemReadiness.visibility.retention.tab.placeholder',
            {
              defaultMessage: 'Retention tab content will be implemented here.',
            }
          )}
        </p>
      </EuiText>
    </>
  );
};

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
      content: <CoverageTabContent />,
    },
    {
      id: 'quality',
      name: i18n.translate('xpack.securitySolution.siemReadiness.visibility.quality.tab.title', {
        defaultMessage: 'Quality',
      }),
      content: <QualityTabContent />,
    },
    {
      id: 'continuity',
      name: i18n.translate('xpack.securitySolution.siemReadiness.visibility.continuity.tab.title', {
        defaultMessage: 'Continuity',
      }),
      content: <ContinuityTabContent />,
    },
    {
      id: 'retention',
      name: i18n.translate('xpack.securitySolution.siemReadiness.visibility.retention.tab.title', {
        defaultMessage: 'Retention',
      }),
      content: <RetentionTabContent />,
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
