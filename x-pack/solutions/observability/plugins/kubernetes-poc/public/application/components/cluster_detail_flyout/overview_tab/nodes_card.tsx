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

interface NodesCardProps {
  clusterName: string;
  timeRange: TimeRange;
  height?: number;
}

interface NodesData {
  total_nodes: number;
  healthy_nodes: number;
  unhealthy_nodes: number;
}

/**
 * ES|QL query for node counts by health status.
 * Nodes with condition_ready > 0 are healthy, <= 0 are unhealthy.
 */
const getNodesEsql = (clusterName: string) => `FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name == "${clusterName}"
  AND k8s.node.name IS NOT NULL
  AND k8s.node.condition_ready IS NOT NULL
| STATS
    total_nodes = COUNT_DISTINCT(k8s.node.name),
    healthy_nodes = COUNT_DISTINCT(k8s.node.name) WHERE k8s.node.condition_ready > 0,
    unhealthy_nodes = COUNT_DISTINCT(k8s.node.name) WHERE k8s.node.condition_ready <= 0`;

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

export const NodesCard: React.FC<NodesCardProps> = ({ clusterName, timeRange, height = 120 }) => {
  const { euiTheme } = useEuiTheme();
  const query = useMemo(() => getNodesEsql(clusterName), [clusterName]);

  const { data, loading } = useEsqlQuery<NodesData>({
    query,
    timeRange,
  });

  // Get the first row of results (single aggregation result)
  const nodesData = data?.[0];
  const totalNodes = nodesData?.total_nodes ?? 0;
  const healthyNodes = nodesData?.healthy_nodes ?? 0;
  const unhealthyNodes = nodesData?.unhealthy_nodes ?? 0;

  return (
    <div
      style={{
        height: `100%`,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <EuiText size="m" style={{ fontWeight: 700 }}>
        {i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.nodesLabel', {
          defaultMessage: 'Nodes',
        })}
      </EuiText>
      <EuiFlexGroup gutterSize="none" responsive={false} alignItems="flexEnd" style={{ flex: 1 }}>
        <EuiFlexItem>
          <MetricItem
            value={totalNodes}
            label={i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.totalLabel', {
              defaultMessage: 'Total',
            })}
            isLoading={loading}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <MetricItem
            value={healthyNodes}
            label={i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.healthyLabel', {
              defaultMessage: 'Healthy',
            })}
            color={euiTheme.colors.success}
            isLoading={loading}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <MetricItem
            value={unhealthyNodes}
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
