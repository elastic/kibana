/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiSpacer,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { TimeRange } from '@kbn/es-query';
import type { ClusterData } from '../../../../common/cluster_listing';
import { FlyoutHeader } from './flyout_header';
import { FlyoutTabs, type ClusterDetailTab } from './flyout_tabs';
import {
  DiskSizeCard,
  MemoryTotalCard,
  NamespacesCard,
  PodsCard,
  ContainersCard,
  MemoryUtilChart,
  PodsUtilChart,
  CpuUtilChart,
  VolumeUtilChart,
  NetworkTrafficChart,
  NodesCard,
  SlosCard,
  SloBurnRateCard,
  WorkloadResourcesTable,
  ClusterHealthPanel,
} from './overview_tab';

interface ClusterDetailFlyoutProps {
  cluster: ClusterData;
  timeRange: TimeRange;
  onClose: () => void;
}

export const ClusterDetailFlyout: React.FC<ClusterDetailFlyoutProps> = ({
  cluster,
  timeRange,
  onClose,
}) => {
  const flyoutTitleId = useGeneratedHtmlId({
    prefix: 'clusterDetailFlyout',
  });

  const [activeTab, setActiveTab] = useState<ClusterDetailTab>('overview');

  const renderTabContent = () => {
    if (activeTab === 'overview') {
      return (
        <>
          <EuiSpacer size="s" />
          {/* Top section: 2-column metric grid | Cluster Health panel */}
          <EuiFlexGroup gutterSize="s" alignItems="stretch">
            {/* Left section: 2x3 grid of metric cards */}
            <EuiFlexItem grow={2}>
              <EuiFlexGroup direction="column" gutterSize="s">
                {/* Row 1: Disk size | Memory */}
                <EuiFlexItem>
                  <EuiFlexGroup gutterSize="s">
                    <EuiFlexItem>
                      <EuiPanel hasBorder paddingSize="s">
                        <DiskSizeCard
                          clusterName={cluster.clusterName}
                          timeRange={timeRange}
                          height={100}
                        />
                      </EuiPanel>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiPanel hasBorder paddingSize="s">
                        <MemoryTotalCard
                          clusterName={cluster.clusterName}
                          timeRange={timeRange}
                          height={100}
                        />
                      </EuiPanel>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                {/* Row 2: Nodes | Pods */}
                <EuiFlexItem>
                  <EuiFlexGroup gutterSize="s">
                    <EuiFlexItem>
                      <EuiPanel hasBorder paddingSize="s">
                        <NodesCard
                          clusterName={cluster.clusterName}
                          timeRange={timeRange}
                          height={80}
                        />
                      </EuiPanel>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiPanel hasBorder paddingSize="s">
                        <PodsCard
                          clusterName={cluster.clusterName}
                          timeRange={timeRange}
                          height={80}
                        />
                      </EuiPanel>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                {/* Row 3: Containers | Namespaces */}
                <EuiFlexItem>
                  <EuiFlexGroup gutterSize="s">
                    <EuiFlexItem>
                      <EuiPanel hasBorder paddingSize="s">
                        <ContainersCard
                          clusterName={cluster.clusterName}
                          timeRange={timeRange}
                          height={80}
                        />
                      </EuiPanel>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiPanel hasBorder paddingSize="s">
                        <NamespacesCard
                          clusterName={cluster.clusterName}
                          timeRange={timeRange}
                          height={80}
                        />
                      </EuiPanel>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>

            {/* Right section: Cluster health panel (full height) */}
            <EuiFlexItem grow={1}>
              <EuiPanel hasBorder paddingSize="none" style={{ height: '100%' }}>
                <ClusterHealthPanel height={320} />
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="s" />

          {/* Charts Row 1: CPU util (larger) | Memory util + Volume util stacked */}
          <EuiFlexGroup gutterSize="s" alignItems="stretch">
            {/* Left: CPU util - takes more space */}
            <EuiFlexItem grow={3}>
              <EuiPanel hasBorder paddingSize="s" style={{ height: '100%' }}>
                <CpuUtilChart
                  clusterName={cluster.clusterName}
                  timeRange={timeRange}
                  height={280}
                />
              </EuiPanel>
            </EuiFlexItem>
            {/* Right: Memory util + Volume util stacked */}
            <EuiFlexItem grow={2}>
              <EuiFlexGroup direction="column" gutterSize="s" style={{ height: '100%' }}>
                <EuiFlexItem>
                  <EuiPanel hasBorder paddingSize="s" style={{ height: '100%' }}>
                    <MemoryUtilChart
                      clusterName={cluster.clusterName}
                      timeRange={timeRange}
                      height={130}
                    />
                  </EuiPanel>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiPanel hasBorder paddingSize="s" style={{ height: '100%' }}>
                    <VolumeUtilChart
                      clusterName={cluster.clusterName}
                      timeRange={timeRange}
                      height={130}
                    />
                  </EuiPanel>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="s" />

          {/* Charts Row 2: Pods util | Network Traffic (50/50) */}
          <EuiFlexGroup gutterSize="s" alignItems="stretch">
            <EuiFlexItem grow={1}>
              <EuiPanel hasBorder paddingSize="s" style={{ height: '100%' }}>
                <PodsUtilChart
                  clusterName={cluster.clusterName}
                  timeRange={timeRange}
                  height={250}
                />
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem grow={1}>
              <EuiPanel hasBorder paddingSize="s" style={{ height: '100%' }}>
                <NetworkTrafficChart
                  clusterName={cluster.clusterName}
                  timeRange={timeRange}
                  height={250}
                />
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="s" />

          {/* SLOs Section: SLOs Summary | Burn Rate */}
          <EuiFlexGroup gutterSize="s" alignItems="stretch">
            <EuiFlexItem grow={1}>
              <EuiPanel hasBorder paddingSize="s" style={{ height: '100%' }}>
                <SlosCard height={120} />
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem grow={1}>
              <EuiPanel hasBorder paddingSize="s" style={{ height: '100%' }}>
                <SloBurnRateCard height={120} />
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="s" />

          {/* Row 4: Workload Resources Table */}
          <WorkloadResourcesTable clusterName={cluster.clusterName} timeRange={timeRange} />
        </>
      );
    }

    // Placeholder for other tabs
    return null;
  };

  return (
    <EuiFlyout
      ownFocus
      onClose={onClose}
      aria-labelledby={flyoutTitleId}
      size="l"
      data-test-subj="kubernetesPocClusterDetailFlyout"
    >
      <EuiFlyoutBody>
        <FlyoutHeader cluster={cluster} />
        <EuiSpacer size="s" />
        <FlyoutTabs activeTab={activeTab} onTabChange={setActiveTab} />
        {renderTabContent()}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
