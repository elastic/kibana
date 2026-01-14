/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTab, EuiTabs } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export type ClusterDetailTab =
  | 'overview'
  | 'logs'
  | 'events'
  | 'services'
  | 'alerts'
  | 'slos'
  | 'significantEvents';

interface FlyoutTabsProps {
  activeTab: ClusterDetailTab;
  onTabChange: (tab: ClusterDetailTab) => void;
}

const TABS: Array<{ id: ClusterDetailTab; label: string; disabled?: boolean }> = [
  {
    id: 'overview',
    label: i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.tabs.overview', {
      defaultMessage: 'Overview',
    }),
  },
  {
    id: 'logs',
    label: i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.tabs.logs', {
      defaultMessage: 'Logs',
    }),
    disabled: true,
  },
  {
    id: 'events',
    label: i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.tabs.events', {
      defaultMessage: 'Events',
    }),
    disabled: true,
  },
  {
    id: 'services',
    label: i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.tabs.services', {
      defaultMessage: 'Services',
    }),
    disabled: true,
  },
  {
    id: 'alerts',
    label: i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.tabs.alerts', {
      defaultMessage: 'Alerts',
    }),
    disabled: true,
  },
  {
    id: 'slos',
    label: i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.tabs.slos', {
      defaultMessage: 'SLOs',
    }),
    disabled: true,
  },
  {
    id: 'significantEvents',
    label: i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.tabs.significantEvents', {
      defaultMessage: 'Significant events',
    }),
    disabled: true,
  },
];

export const FlyoutTabs: React.FC<FlyoutTabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <EuiTabs>
      {TABS.map((tab) => (
        <EuiTab
          key={tab.id}
          isSelected={activeTab === tab.id}
          onClick={() => !tab.disabled && onTabChange(tab.id)}
          disabled={tab.disabled}
          data-test-subj={`clusterDetailFlyoutTab-${tab.id}`}
        >
          {tab.label}
        </EuiTab>
      ))}
    </EuiTabs>
  );
};
