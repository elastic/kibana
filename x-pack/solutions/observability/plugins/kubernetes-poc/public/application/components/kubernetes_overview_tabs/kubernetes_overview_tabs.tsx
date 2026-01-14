/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiTab, EuiTabs } from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { KubernetesPage } from './kubernetes_page';

interface TabConfig {
  id: KubernetesPage;
  label: string;
  path?: string;
}

const TABS: TabConfig[] = [
  {
    id: KubernetesPage.Overview,
    label: i18n.translate('xpack.kubernetesPoc.tabs.overview', {
      defaultMessage: 'Overview',
    }),
    path: '/overview',
  },
  {
    id: KubernetesPage.Clusters,
    label: i18n.translate('xpack.kubernetesPoc.tabs.clusters', {
      defaultMessage: 'Clusters',
    }),
    path: '/clusters',
  },
  {
    id: KubernetesPage.Nodes,
    label: i18n.translate('xpack.kubernetesPoc.tabs.nodes', {
      defaultMessage: 'Nodes',
    }),
  },
  {
    id: KubernetesPage.Namespaces,
    label: i18n.translate('xpack.kubernetesPoc.tabs.namespaces', {
      defaultMessage: 'Namespaces',
    }),
  },
  {
    id: KubernetesPage.DaemonSets,
    label: i18n.translate('xpack.kubernetesPoc.tabs.daemonSets', {
      defaultMessage: 'DaemonSets',
    }),
  },
  {
    id: KubernetesPage.Services,
    label: i18n.translate('xpack.kubernetesPoc.tabs.services', {
      defaultMessage: 'Services',
    }),
  },
  {
    id: KubernetesPage.Deployments,
    label: i18n.translate('xpack.kubernetesPoc.tabs.deployments', {
      defaultMessage: 'Deployments',
    }),
  },
  {
    id: KubernetesPage.Containers,
    label: i18n.translate('xpack.kubernetesPoc.tabs.containers', {
      defaultMessage: 'Containers',
    }),
  },
  {
    id: KubernetesPage.Pods,
    label: i18n.translate('xpack.kubernetesPoc.tabs.pods', {
      defaultMessage: 'Pods',
    }),
  },
];

export interface KubernetesOverviewTabsProps {
  /** The currently active page/tab */
  activePage: KubernetesPage;
}

export const KubernetesOverviewTabs: React.FC<KubernetesOverviewTabsProps> = ({ activePage }) => {
  const history = useHistory();

  const handleTabClick = useCallback(
    (tab: TabConfig) => {
      if (tab.path) {
        history.push(tab.path);
      }
    },
    [history]
  );

  return (
    <EuiTabs>
      {TABS.map((tab) => (
        <EuiTab
          key={tab.id}
          isSelected={activePage === tab.id}
          onClick={() => handleTabClick(tab)}
          disabled={!tab.path}
          data-test-subj={`kubernetesPocTab-${tab.id}`}
        >
          {tab.label}
        </EuiTab>
      ))}
    </EuiTabs>
  );
};
