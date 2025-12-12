/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiIcon,
  EuiProgress,
  EuiSpacer,
  EuiPanel,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ClusterData } from '../../../../common/cluster_listing';

interface ClusterDetailFlyoutProps {
  cluster: ClusterData;
  onClose: () => void;
}

export const ClusterDetailFlyout: React.FC<ClusterDetailFlyoutProps> = ({ cluster, onClose }) => {
  const flyoutTitleId = useGeneratedHtmlId({
    prefix: 'clusterDetailFlyout',
  });

  const getHealthBadge = () => {
    const color = cluster.healthStatus === 'healthy' ? 'success' : 'danger';
    const label =
      cluster.healthStatus === 'healthy'
        ? i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.healthyLabel', {
            defaultMessage: 'Healthy',
          })
        : i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.unhealthyLabel', {
            defaultMessage: 'Unhealthy',
          });
    return <EuiBadge color={color}>{label}</EuiBadge>;
  };

  const getCloudProviderIcon = () => {
    if (!cluster.cloudProvider) return null;
    const providerIcons: Record<string, string> = {
      aws: 'logoAWS',
      gcp: 'logoGCP',
      azure: 'logoAzure',
    };
    const icon = providerIcons[cluster.cloudProvider.toLowerCase()];
    return icon ? <EuiIcon type={icon} size="l" /> : null;
  };

  const formatUtilization = (value: number | null) => {
    if (value === null || value === undefined || isNaN(value)) {
      return '—';
    }
    return `${value.toFixed(2)}%`;
  };

  const getUtilizationColor = (value: number | null): 'success' | 'warning' | 'danger' => {
    if (value === null || value === undefined || isNaN(value)) return 'success';
    if (value < 70) return 'success';
    if (value < 90) return 'warning';
    return 'danger';
  };

  const clusterInfoItems = [
    {
      title: i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.healthLabel', {
        defaultMessage: 'Health Status',
      }),
      description: getHealthBadge(),
    },
    {
      title: i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.providerLabel', {
        defaultMessage: 'Cloud Provider',
      }),
      description: (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          {getCloudProviderIcon() && (
            <EuiFlexItem grow={false}>{getCloudProviderIcon()}</EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiText size="s">{cluster.cloudProvider || '—'}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
  ];

  const resourceInfoItems = [
    {
      title: i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.nodesLabel', {
        defaultMessage: 'Total Nodes',
      }),
      description: cluster.totalNodes,
    },
    {
      title: i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.namespacesLabel', {
        defaultMessage: 'Namespaces',
      }),
      description: cluster.totalNamespaces,
    },
  ];

  const podItems = [
    {
      title: i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.runningPodsLabel', {
        defaultMessage: 'Running Pods',
      }),
      description: <EuiBadge color="success">{cluster.runningPods}</EuiBadge>,
    },
    {
      title: i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.pendingPodsLabel', {
        defaultMessage: 'Pending Pods',
      }),
      description: <EuiBadge color="warning">{cluster.pendingPods}</EuiBadge>,
    },
    {
      title: i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.failedPodsLabel', {
        defaultMessage: 'Failed Pods',
      }),
      description: <EuiBadge color="danger">{cluster.failedPods}</EuiBadge>,
    },
  ];

  return (
    <EuiFlyout
      ownFocus
      onClose={onClose}
      aria-labelledby={flyoutTitleId}
      size="l"
      data-test-subj="kubernetesPocClusterDetailFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="m">
          {getCloudProviderIcon() && (
            <EuiFlexItem grow={false}>{getCloudProviderIcon()}</EuiFlexItem>
          )}
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2 id={flyoutTitleId}>{cluster.clusterName}</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{getHealthBadge()}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {/* Cluster Information */}
        <EuiPanel hasBorder paddingSize="m">
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.clusterInfoTitle', {
                defaultMessage: 'Cluster Information',
              })}
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiDescriptionList type="column" listItems={clusterInfoItems} compressed />
        </EuiPanel>

        <EuiSpacer size="m" />

        {/* Resources */}
        <EuiPanel hasBorder paddingSize="m">
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.resourcesTitle', {
                defaultMessage: 'Resources',
              })}
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiDescriptionList type="column" listItems={resourceInfoItems} compressed />
        </EuiPanel>

        <EuiSpacer size="m" />

        {/* Pod Status */}
        <EuiPanel hasBorder paddingSize="m">
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.podStatusTitle', {
                defaultMessage: 'Pod Status',
              })}
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiDescriptionList type="column" listItems={podItems} compressed />
        </EuiPanel>

        <EuiSpacer size="m" />

        {/* Resource Utilization */}
        <EuiPanel hasBorder paddingSize="m">
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.utilizationTitle', {
                defaultMessage: 'Resource Utilization',
              })}
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiFlexItem>
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false} style={{ minWidth: 100 }}>
                  <EuiText size="s">
                    {i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.cpuLabel', {
                      defaultMessage: 'CPU',
                    })}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiProgress
                    value={cluster.cpuUtilization ?? 0}
                    max={100}
                    size="l"
                    color={getUtilizationColor(cluster.cpuUtilization)}
                    valueText={formatUtilization(cluster.cpuUtilization)}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false} style={{ minWidth: 100 }}>
                  <EuiText size="s">
                    {i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.memoryLabel', {
                      defaultMessage: 'Memory',
                    })}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiProgress
                    value={cluster.memoryUtilization ?? 0}
                    max={100}
                    size="l"
                    color={getUtilizationColor(cluster.memoryUtilization)}
                    valueText={formatUtilization(cluster.memoryUtilization)}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
