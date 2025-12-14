/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { TimeRange } from '@kbn/es-query';
import { useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useEsqlQuery } from '../../../hooks/use_esql_query';
import { MetricCard } from '../cluster_detail_flyout/overview_tab/metric_card';

interface PodsMetricCardProps {
  timeRange: TimeRange;
}

interface PodsData {
  total_pods: number;
}

/**
 * ES|QL query for total pod count across all clusters
 */
const PODS_ESQL = `FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name IS NOT NULL
  AND k8s.pod.uid IS NOT NULL
| STATS total_pods = COUNT_DISTINCT(k8s.pod.uid)`;

export const PodsMetricCard: React.FC<PodsMetricCardProps> = ({ timeRange }) => {
  const { euiTheme } = useEuiTheme();
  const { data, loading } = useEsqlQuery<PodsData>({
    query: PODS_ESQL,
    timeRange,
  });

  const podsData = data?.[0];
  const totalPods = podsData?.total_pods ?? null;

  return (
    <MetricCard
      title={i18n.translate('xpack.kubernetesPoc.kubernetesOverview.podsLabel', {
        defaultMessage: 'Pods',
      })}
      value={totalPods}
      isLoading={loading}
      formatter="number"
      valueColor={euiTheme.colors.primary}
    />
  );
};
