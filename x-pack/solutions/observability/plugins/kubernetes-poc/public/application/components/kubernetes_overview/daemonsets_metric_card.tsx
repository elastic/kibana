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

interface DaemonsetsMetricCardProps {
  timeRange: TimeRange;
}

interface DaemonsetsData {
  daemonset_count: number;
}

/**
 * ES|QL query for total daemonset count across all clusters
 */
const DAEMONSETS_ESQL = `FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name IS NOT NULL
  AND k8s.daemonset.name IS NOT NULL
| STATS daemonset_count = COUNT_DISTINCT(k8s.daemonset.name)`;

export const DaemonsetsMetricCard: React.FC<DaemonsetsMetricCardProps> = ({ timeRange }) => {
  const { euiTheme } = useEuiTheme();
  const { data, loading } = useEsqlQuery<DaemonsetsData>({
    query: DAEMONSETS_ESQL,
    timeRange,
  });

  const daemonsetsData = data?.[0];
  const daemonsetCount = daemonsetsData?.daemonset_count ?? null;

  return (
    <MetricCard
      title={i18n.translate('xpack.kubernetesPoc.kubernetesOverview.daemonsetsLabel', {
        defaultMessage: 'DaemonSets',
      })}
      value={daemonsetCount}
      isLoading={loading}
      formatter="number"
      valueColor={euiTheme.colors.primary}
    />
  );
};
