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

interface NamespacesCardProps {
  clusterName: string;
  timeRange: TimeRange;
  height?: number;
}

interface NamespacesData {
  total_namespaces: number;
  healthy_namespaces: number;
  unhealthy_namespaces: number;
}

/**
 * ES|QL query for namespace counts by health status.
 * Namespace phase 1 = Active (healthy), other values = unhealthy.
 */
const getNamespacesEsql = (clusterName: string) => `FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name == "${clusterName}"
  AND k8s.namespace.name IS NOT NULL
  AND k8s.namespace.phase IS NOT NULL
  AND cloud.provider IS NOT NULL
| STATS
    total_namespaces = COUNT_DISTINCT(k8s.namespace.name),
    healthy_namespaces = COUNT_DISTINCT(k8s.namespace.name) WHERE k8s.namespace.phase == 1,
    unhealthy_namespaces = COUNT_DISTINCT(k8s.namespace.name) WHERE k8s.namespace.phase != 1`;

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

export const NamespacesCard: React.FC<NamespacesCardProps> = ({
  clusterName,
  timeRange,
  height = 120,
}) => {
  const { euiTheme } = useEuiTheme();
  const query = useMemo(() => getNamespacesEsql(clusterName), [clusterName]);

  const { data, loading } = useEsqlQuery<NamespacesData>({
    query,
    timeRange,
  });

  // Get the first row of results (single aggregation result)
  const namespacesData = data?.[0];
  const totalNamespaces = namespacesData?.total_namespaces ?? 0;
  const healthyNamespaces = namespacesData?.healthy_namespaces ?? 0;
  const unhealthyNamespaces = namespacesData?.unhealthy_namespaces ?? 0;

  return (
    <div
      style={{
        height: `100%`,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <EuiText size="m" style={{ fontWeight: 700 }}>
        {i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.namespacesLabel', {
          defaultMessage: 'Namespaces',
        })}
      </EuiText>
      <EuiFlexGroup gutterSize="none" responsive={false} alignItems="flexEnd" style={{ flex: 1 }}>
        <EuiFlexItem>
          <MetricItem
            value={totalNamespaces}
            label={i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.totalLabel', {
              defaultMessage: 'Total',
            })}
            isLoading={loading}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <MetricItem
            value={healthyNamespaces}
            label={i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.healthyLabel', {
              defaultMessage: 'Healthy',
            })}
            color={euiTheme.colors.success}
            isLoading={loading}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <MetricItem
            value={unhealthyNamespaces}
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
