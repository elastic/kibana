/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiBadge,
  EuiIcon,
  EuiText,
  EuiButton,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ClusterData } from '../../../../common/cluster_listing';

interface FlyoutHeaderProps {
  cluster: ClusterData;
}

export const FlyoutHeader: React.FC<FlyoutHeaderProps> = ({ cluster }) => {
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

  // Format last updated date - using current date as placeholder since this data isn't in ClusterData yet
  const lastUpdated = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="s" wrap>
        <EuiFlexItem grow={false}>
          <EuiBadge color="default">
            {i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.clusterBadge', {
              defaultMessage: 'Cluster',
            })}
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{getHealthBadge()}</EuiFlexItem>
        {cluster.cloudProvider && (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              {getCloudProviderIcon() && (
                <EuiFlexItem grow={false}>{getCloudProviderIcon()}</EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <EuiBadge color="default">{cluster.cloudProvider}</EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiBadge color="default">
            {i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.apiServerVersion', {
              defaultMessage: 'API Server v.1.29.3',
            })}
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="default">
            {i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.kubeletVersion', {
              defaultMessage: 'Kubelet version v.1.29.3',
            })}
          </EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiFlexGroup alignItems="flexStart" gutterSize="m" wrap>
        <EuiFlexItem>
          <EuiTitle size="m">
            <h2>{cluster.clusterName}</h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            color="text"
            iconType="arrowDown"
            iconSide="right"
            data-test-subj="clusterDetailFlyoutTakeAction"
          >
            {i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.takeAction', {
              defaultMessage: 'Take action',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiText size="xs" color="subdued">
        {i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.lastUpdated', {
          defaultMessage: 'Last updated by elastic on {date}',
          values: { date: lastUpdated },
        })}
      </EuiText>
    </>
  );
};
