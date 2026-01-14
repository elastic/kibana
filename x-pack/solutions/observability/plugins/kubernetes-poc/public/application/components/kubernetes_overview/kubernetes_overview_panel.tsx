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
import { NamespacesMetricCard } from './namespaces_metric_card';
import { NodesMetricCard } from './nodes_metric_card';
import { PodsMetricCard } from './pods_metric_card';
import { ContainersMetricCard } from './containers_metric_card';
import { JobsMetricCard } from './jobs_metric_card';
import { DeploymentsMetricCard } from './deployments_metric_card';
import { ReplicasetsMetricCard } from './replicasets_metric_card';
import { DaemonsetsMetricCard } from './daemonsets_metric_card';
import { StatefulsetsMetricCard } from './statefulsets_metric_card';

interface KubernetesOverviewPanelProps {
  timeRange: TimeRange;
}

export const KubernetesOverviewPanel: React.FC<KubernetesOverviewPanelProps> = ({ timeRange }) => {
  return (
    <EuiPanel hasBorder paddingSize="m" grow={false}>
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

      <EuiSpacer size="m" />

      {/* Row 1: Clusters (wide) | Namespaces (narrow) */}
      <EuiFlexGroup gutterSize="s" responsive={false}>
        <EuiFlexItem grow={3}>
          <EuiPanel hasBorder paddingSize="s">
            <ClustersMetricCard timeRange={timeRange} />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <EuiPanel hasBorder paddingSize="s" style={{ height: '100%' }}>
            <NamespacesMetricCard timeRange={timeRange} height={80} />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      {/* Row 2: Nodes | Pods | Containers | Jobs (with sparkline trends) */}
      <EuiFlexGroup gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiPanel hasBorder paddingSize="s">
            <NodesMetricCard timeRange={timeRange} height={100} />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel hasBorder paddingSize="s">
            <PodsMetricCard timeRange={timeRange} height={100} />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel hasBorder paddingSize="s">
            <ContainersMetricCard timeRange={timeRange} height={100} />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel hasBorder paddingSize="s">
            <JobsMetricCard timeRange={timeRange} height={100} />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      {/* Row 3: Deployments | ReplicaSets | DaemonSets | StatefulSets */}
      <EuiFlexGroup gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiPanel hasBorder paddingSize="s">
            <DeploymentsMetricCard timeRange={timeRange} height={80} />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel hasBorder paddingSize="s">
            <ReplicasetsMetricCard timeRange={timeRange} height={80} />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel hasBorder paddingSize="s">
            <DaemonsetsMetricCard timeRange={timeRange} height={80} />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel hasBorder paddingSize="s">
            <StatefulsetsMetricCard timeRange={timeRange} height={80} />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
