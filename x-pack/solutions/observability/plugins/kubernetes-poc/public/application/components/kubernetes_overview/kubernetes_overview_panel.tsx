/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, EuiPanel, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { TimeRange } from '@kbn/es-query';
import { ClustersMetricCard } from './clusters_metric_card';
import { NodesMetricCard } from './nodes_metric_card';
import { NamespacesMetricCard } from './namespaces_metric_card';
import { ContainersMetricCard } from './containers_metric_card';
import { PodsMetricCard } from './pods_metric_card';
import { DaemonsetsMetricCard } from './daemonsets_metric_card';
import { ServicesMetricCard } from './services_metric_card';
import { DeploymentsMetricCard } from './deployments_metric_card';

interface KubernetesOverviewPanelProps {
  timeRange: TimeRange;
}

export const KubernetesOverviewPanel: React.FC<KubernetesOverviewPanelProps> = ({ timeRange }) => {
  return (
    <>
      <EuiPanel hasBorder paddingSize="s" grow={false}>
        {/* Header with Kubernetes icon */}
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="logoKubernetes" size="l" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText>
              <h3 style={{ margin: 0, fontWeight: 600 }}>
                {i18n.translate('xpack.kubernetesPoc.kubernetesOverview.panelTitle', {
                  defaultMessage: 'Kubernetes Overview',
                })}
              </h3>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      <EuiSpacer size="s" />

      {/* Metrics grid - 2 main columns layout:
          Column 1:
            - Row 1: Clusters
            - Row 2: DaemonSets, Services, Deployments
          Column 2:
            - Row 1: Nodes, Namespaces
            - Row 2: Containers, Pods
      */}
      <EuiFlexGroup gutterSize="s" responsive={false}>
        {/* Column 1 */}
        <EuiFlexItem grow={1}>
          <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
            {/* Row 1: Clusters */}
            <EuiFlexItem>
              <EuiPanel hasBorder paddingSize="s">
                <ClustersMetricCard timeRange={timeRange} />
              </EuiPanel>
            </EuiFlexItem>
            {/* Row 2: DaemonSets, Services, Deployments */}
            <EuiFlexItem>
              <EuiFlexGroup gutterSize="s" responsive={false}>
                <EuiFlexItem>
                  <EuiPanel hasBorder paddingSize="s" style={{ height: '100%' }}>
                    <DaemonsetsMetricCard timeRange={timeRange} />
                  </EuiPanel>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiPanel hasBorder paddingSize="s" style={{ height: '100%' }}>
                    <ServicesMetricCard timeRange={timeRange} />
                  </EuiPanel>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiPanel hasBorder paddingSize="s" style={{ height: '100%' }}>
                    <DeploymentsMetricCard timeRange={timeRange} />
                  </EuiPanel>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        {/* Column 2 */}
        <EuiFlexItem grow={1}>
          <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
            {/* Row 1: Nodes, Namespaces */}
            <EuiFlexItem>
              <EuiFlexGroup gutterSize="s" responsive={false}>
                <EuiFlexItem>
                  <EuiPanel hasBorder paddingSize="s" style={{ height: '100%' }}>
                    <NodesMetricCard timeRange={timeRange} />
                  </EuiPanel>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiPanel hasBorder paddingSize="s" style={{ height: '100%' }}>
                    <NamespacesMetricCard timeRange={timeRange} />
                  </EuiPanel>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            {/* Row 2: Containers, Pods */}
            <EuiFlexItem>
              <EuiFlexGroup gutterSize="s" responsive={false}>
                <EuiFlexItem>
                  <EuiPanel hasBorder paddingSize="s" style={{ height: '100%' }}>
                    <ContainersMetricCard timeRange={timeRange} />
                  </EuiPanel>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiPanel hasBorder paddingSize="s" style={{ height: '100%' }}>
                    <PodsMetricCard timeRange={timeRange} />
                  </EuiPanel>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
