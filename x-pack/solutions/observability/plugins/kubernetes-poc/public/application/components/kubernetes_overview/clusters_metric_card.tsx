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
  EuiText,
  EuiLoadingSpinner,
  EuiLink,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import type { TimeRange } from '@kbn/es-query';
import { useEsqlQuery } from '../../../hooks/use_esql_query';

interface ClustersMetricCardProps {
  timeRange: TimeRange;
}

interface ClustersData {
  healthy_count: number;
  total_count: number;
}

/**
 * ES|QL query that returns both healthy_count and total_count
 */
const CLUSTERS_ESQL = `FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name IS NOT NULL
  AND k8s.node.name IS NOT NULL
  AND k8s.node.condition_ready IS NOT NULL
| STATS
    total_nodes = COUNT_DISTINCT(k8s.node.name),
    ready_nodes = COUNT_DISTINCT(k8s.node.name) WHERE k8s.node.condition_ready > 0
  BY k8s.cluster.name
| EVAL health_status = CASE(ready_nodes < total_nodes, "unhealthy", "healthy")
| STATS
    healthy_count = COUNT(*) WHERE health_status == "healthy",
    total_count = COUNT(*)`;

interface MetricItemProps {
  value: number;
  label: string;
  color?: string;
  isLoading?: boolean;
  onClick?: () => void;
}

const MetricItem: React.FC<MetricItemProps> = ({ value, label, color, isLoading, onClick }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div style={{ textAlign: 'left' }}>
      <EuiText size="xs" color="subdued">
        {label}
      </EuiText>
      {isLoading ? (
        <EuiLoadingSpinner size="m" />
      ) : (
        <EuiLink
          data-test-subj="kubernetesPocMetricItemLink"
          onClick={onClick}
          css={{
            fontSize: '24px',
            fontWeight: 700,
            color: color || euiTheme.colors.primary,
            '&:hover': {
              textDecoration: 'underline',
            },
          }}
        >
          {value}
        </EuiLink>
      )}
    </div>
  );
};

export const ClustersMetricCard: React.FC<ClustersMetricCardProps> = ({ timeRange }) => {
  const { euiTheme } = useEuiTheme();
  const history = useHistory();

  const { data, loading } = useEsqlQuery<ClustersData>({
    query: CLUSTERS_ESQL,
    timeRange,
  });

  const clustersData = data?.[0];
  const totalClusters = clustersData?.total_count ?? 0;
  const healthyClusters = clustersData?.healthy_count ?? 0;
  const unhealthyClusters = totalClusters - healthyClusters;

  const navigateToClusters = () => {
    history.push('/clusters');
  };

  return (
    <div
      style={{
        height: `100%`,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <EuiText size="m" style={{ fontWeight: 700 }}>
        {i18n.translate('xpack.kubernetesPoc.kubernetesOverview.clustersLabel', {
          defaultMessage: 'Clusters',
        })}
      </EuiText>
      <EuiFlexGroup gutterSize="none" responsive={false} alignItems="flexEnd" style={{ flex: 1 }}>
        <EuiFlexItem>
          <MetricItem
            value={totalClusters}
            label={i18n.translate('xpack.kubernetesPoc.kubernetesOverview.totalLabel', {
              defaultMessage: 'Total',
            })}
            isLoading={loading}
            onClick={navigateToClusters}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <MetricItem
            value={healthyClusters}
            label={i18n.translate('xpack.kubernetesPoc.kubernetesOverview.healthyLabel', {
              defaultMessage: 'Healthy',
            })}
            color={euiTheme.colors.success}
            isLoading={loading}
            onClick={navigateToClusters}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <MetricItem
            value={unhealthyClusters}
            label={i18n.translate('xpack.kubernetesPoc.kubernetesOverview.unhealthyLabel', {
              defaultMessage: 'Unhealthy',
            })}
            color={euiTheme.colors.danger}
            isLoading={loading}
            onClick={navigateToClusters}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
