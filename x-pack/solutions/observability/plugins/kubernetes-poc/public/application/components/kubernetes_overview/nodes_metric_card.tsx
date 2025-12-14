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

interface NodesMetricCardProps {
  timeRange: TimeRange;
}

interface NodesData {
  total_nodes: number;
}

/**
 * ES|QL query for total node count across all clusters
 */
const NODES_ESQL = `FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name IS NOT NULL
  AND k8s.node.name IS NOT NULL
| STATS total_nodes = COUNT_DISTINCT(k8s.node.name)`;

export const NodesMetricCard: React.FC<NodesMetricCardProps> = ({ timeRange }) => {
  const { euiTheme } = useEuiTheme();
  const { data, loading } = useEsqlQuery<NodesData>({
    query: NODES_ESQL,
    timeRange,
  });

  const nodesData = data?.[0];
  const totalNodes = nodesData?.total_nodes ?? null;

  return (
    <MetricCard
      title={i18n.translate('xpack.kubernetesPoc.kubernetesOverview.nodesLabel', {
        defaultMessage: 'Nodes',
      })}
      value={totalNodes}
      isLoading={loading}
      formatter="number"
      valueColor={euiTheme.colors.primary}
    />
  );
};
