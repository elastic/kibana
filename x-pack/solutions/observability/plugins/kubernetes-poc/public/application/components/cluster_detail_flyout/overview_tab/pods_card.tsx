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

interface PodsCardProps {
  clusterName: string;
  timeRange: TimeRange;
  height?: number;
}

interface PodsData {
  total_pods: number;
  healthy_pods: number;
  unhealthy_pods: number;
}

/**
 * ES|QL query for pod counts by health status.
 * Phase values: 1=Pending, 2=Running (healthy), 3=Succeeded, 4=Failed (unhealthy)
 */
const getPodsEsql = (clusterName: string) => `FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name == "${clusterName}"
  AND k8s.pod.uid IS NOT NULL
  AND k8s.pod.phase IS NOT NULL
| STATS
    total_pods = COUNT_DISTINCT(k8s.pod.uid),
    healthy_pods = COUNT_DISTINCT(k8s.pod.uid) WHERE k8s.pod.phase == 2,
    unhealthy_pods = COUNT_DISTINCT(k8s.pod.uid) WHERE k8s.pod.phase == 4`;

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

export const PodsCard: React.FC<PodsCardProps> = ({ clusterName, timeRange, height = 120 }) => {
  const { euiTheme } = useEuiTheme();
  const query = useMemo(() => getPodsEsql(clusterName), [clusterName]);

  const { data, loading } = useEsqlQuery<PodsData>({
    query,
    timeRange,
  });

  // Get the first row of results (single aggregation result)
  const podsData = data?.[0];
  const totalPods = podsData?.total_pods ?? 0;
  const healthyPods = podsData?.healthy_pods ?? 0;
  const unhealthyPods = podsData?.unhealthy_pods ?? 0;

  return (
    <div
      style={{
        height: `100%`,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <EuiText size="m" style={{ fontWeight: 700 }}>
        {i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.podsLabel', {
          defaultMessage: 'Pods',
        })}
      </EuiText>
      <EuiFlexGroup gutterSize="none" responsive={false} alignItems="flexEnd" style={{ flex: 1 }}>
        <EuiFlexItem>
          <MetricItem
            value={totalPods}
            label={i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.totalLabel', {
              defaultMessage: 'Total',
            })}
            isLoading={loading}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <MetricItem
            value={healthyPods}
            label={i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.healthyLabel', {
              defaultMessage: 'Healthy',
            })}
            color={euiTheme.colors.success}
            isLoading={loading}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <MetricItem
            value={unhealthyPods}
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
