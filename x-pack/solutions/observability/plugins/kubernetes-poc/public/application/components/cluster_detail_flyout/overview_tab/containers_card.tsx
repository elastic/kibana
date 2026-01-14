/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiLoadingSpinner, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { TimeRange } from '@kbn/es-query';
import { useEsqlQuery } from '../../../../hooks/use_esql_query';

interface ContainersCardProps {
  clusterName: string;
  timeRange: TimeRange;
  height?: number;
}

interface ContainersData {
  total_containers: number;
  healthy_containers: number;
  unhealthy_containers: number;
}

/**
 * ES|QL query for container counts by health status.
 * Containers with ready > 0 are healthy, <= 0 are unhealthy.
 */
const getContainersEsql = (clusterName: string) => `FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name == "${clusterName}"
  AND k8s.container.name IS NOT NULL
  AND k8s.container.ready IS NOT NULL
| STATS
    total_containers = COUNT_DISTINCT(k8s.container.name),
    healthy_containers = COUNT_DISTINCT(k8s.container.name) WHERE k8s.container.ready > 0,
    unhealthy_containers = COUNT_DISTINCT(k8s.container.name) WHERE k8s.container.ready <= 0`;

interface MetricItemProps {
  value: number;
  label: string;
  color?: string;
  isLoading?: boolean;
}

const MetricItem: React.FC<MetricItemProps> = ({ value, label, color, isLoading }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div style={{ textAlign: 'left' }}>
      <EuiText size="xs" color="subdued">
        {label}
      </EuiText>
      {isLoading ? (
        <EuiLoadingSpinner size="m" />
      ) : (
        <EuiText
          style={{ fontSize: '24px', fontWeight: 700, color: color || euiTheme.colors.primary }}
        >
          {value}
        </EuiText>
      )}
    </div>
  );
};

export const ContainersCard: React.FC<ContainersCardProps> = ({
  clusterName,
  timeRange,
  height = 120,
}) => {
  const { euiTheme } = useEuiTheme();
  const query = useMemo(() => getContainersEsql(clusterName), [clusterName]);

  const { data, loading } = useEsqlQuery<ContainersData>({
    query,
    timeRange,
  });

  // Get the first row of results (single aggregation result)
  const containersData = data?.[0];
  const totalContainers = containersData?.total_containers ?? 0;
  const healthyContainers = containersData?.healthy_containers ?? 0;
  const unhealthyContainers = containersData?.unhealthy_containers ?? 0;

  return (
    <div
      style={{
        height: `100%`,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <EuiText size="m" style={{ fontWeight: 700 }}>
        {i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.containersLabel', {
          defaultMessage: 'Containers',
        })}
      </EuiText>
      <EuiFlexGroup gutterSize="none" responsive={false} alignItems="flexEnd" style={{ flex: 1 }}>
        <EuiFlexItem>
          <MetricItem
            value={totalContainers}
            label={i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.totalLabel', {
              defaultMessage: 'Total',
            })}
            isLoading={loading}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <MetricItem
            value={healthyContainers}
            label={i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.healthyLabel', {
              defaultMessage: 'Healthy',
            })}
            color={euiTheme.colors.success}
            isLoading={loading}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <MetricItem
            value={unhealthyContainers}
            label={i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.unhealthyLabel', {
              defaultMessage: 'Unhealthy',
            })}
            color={euiTheme.colors.danger}
            isLoading={loading}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
