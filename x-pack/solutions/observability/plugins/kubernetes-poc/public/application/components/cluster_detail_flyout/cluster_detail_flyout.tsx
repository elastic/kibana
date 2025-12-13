/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiSpacer,
  EuiPanel,
  EuiFlexGroup,
  useGeneratedHtmlId,
  useEuiTheme,
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
  MemoryUtilChart,
  PodsUtilChart,
  CpuUtilChart,
  NetworkTrafficChart,
  NodesCard,
  SlosCard,
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
  const { euiTheme } = useEuiTheme();
  const flyoutTitleId = useGeneratedHtmlId({
    prefix: 'clusterDetailFlyout',
  });

  const [activeTab, setActiveTab] = useState<ClusterDetailTab>('overview');

  const renderTabContent = () => {
    if (activeTab === 'overview') {
      return (
        <>
          <EuiSpacer size="s" />
          {/* Metric Cards Row */}
          <EuiFlexGroup gutterSize="s">
            <EuiPanel hasBorder paddingSize="none">
              <DiskSizeCard clusterName={cluster.clusterName} timeRange={timeRange} height={120} />
            </EuiPanel>
            <EuiPanel hasBorder paddingSize="none">
              <MemoryTotalCard
                clusterName={cluster.clusterName}
                timeRange={timeRange}
                height={120}
              />
            </EuiPanel>
            <EuiPanel hasBorder paddingSize="none">
              <NamespacesCard
                clusterName={cluster.clusterName}
                timeRange={timeRange}
                height={120}
              />
            </EuiPanel>
            <EuiPanel hasBorder paddingSize="none">
              <PodsCard clusterName={cluster.clusterName} timeRange={timeRange} height={120} />
            </EuiPanel>
          </EuiFlexGroup>

          <EuiSpacer size="s" />

          {/* Row 2: Memory util & Pods util (50/50) */}
          <EuiFlexGroup gutterSize="s">
            <EuiPanel hasBorder paddingSize="none">
              <MemoryUtilChart
                clusterName={cluster.clusterName}
                timeRange={timeRange}
                height={250}
              />
            </EuiPanel>
            <EuiPanel hasBorder paddingSize="none">
              <PodsUtilChart clusterName={cluster.clusterName} timeRange={timeRange} height={250} />
            </EuiPanel>
          </EuiFlexGroup>

          <EuiSpacer size="s" />

          {/* Row 3: CPU util (full height left) | Nodes, SLOs, Network Traffic, Cluster Health (stacked right) */}
          <EuiFlexGroup gutterSize="s" alignItems="stretch">
            {/* Left column: CPU util - height = 120 + 8 + 250 = 378px */}
            <EuiPanel hasBorder paddingSize="none" style={{ flex: 1 }}>
              <CpuUtilChart clusterName={cluster.clusterName} timeRange={timeRange} height={378} />
            </EuiPanel>

            {/* Right column: Nodes, SLOs, Network Traffic, Cluster Health */}
            <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <EuiFlexGroup gutterSize="s">
                <EuiPanel hasBorder paddingSize="none">
                  <NodesCard clusterName={cluster.clusterName} timeRange={timeRange} height={120} />
                </EuiPanel>
                <EuiPanel hasBorder paddingSize="none">
                  <SlosCard height={120} />
                </EuiPanel>
              </EuiFlexGroup>
              <EuiFlexGroup gutterSize="s">
                <EuiPanel hasBorder paddingSize="none">
                  <NetworkTrafficChart
                    clusterName={cluster.clusterName}
                    timeRange={timeRange}
                    height={250}
                  />
                </EuiPanel>
                {/* TODO: Cluster health card */}
                <EuiPanel hasBorder paddingSize="none">
                  <div
                    style={{
                      height: '250px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: euiTheme.colors.subduedText,
                    }}
                  >
                    {i18n.translate(
                      'xpack.kubernetesPoc.renderTabContent.div.clusterHealthComingSoonLabel',
                      { defaultMessage: 'Cluster Health (Coming Soon)' }
                    )}
                  </div>
                </EuiPanel>
              </EuiFlexGroup>
            </div>
          </EuiFlexGroup>
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
