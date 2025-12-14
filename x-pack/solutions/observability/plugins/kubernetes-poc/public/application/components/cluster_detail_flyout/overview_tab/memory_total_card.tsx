/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { TimeRange } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { useEsqlQuery } from '../../../../hooks/use_esql_query';
import { MetricCard } from './metric_card';

interface MemoryTotalCardProps {
  clusterName: string;
  timeRange: TimeRange;
}

interface MemoryTotalData {
  total_memory_bytes: number;
}

/**
 * ES|QL query for total allocatable memory across all nodes in the cluster.
 * Sums the maximum allocatable memory per node.
 */
const getMemoryTotalEsql = (clusterName: string) => `FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name == "${clusterName}" 
  AND k8s.node.name IS NOT NULL
  AND k8s.node.allocatable_memory IS NOT NULL
| STATS 
    node_memory = MAX(k8s.node.allocatable_memory)
  BY k8s.node.name
| STATS total_memory_bytes = SUM(node_memory)`;

export const MemoryTotalCard: React.FC<MemoryTotalCardProps> = ({ clusterName, timeRange }) => {
  const query = useMemo(() => getMemoryTotalEsql(clusterName), [clusterName]);

  const { data, loading } = useEsqlQuery<MemoryTotalData>({
    query,
    timeRange,
  });

  // Get the first row of results (single aggregation result)
  const memoryData = data?.[0];
  const totalMemoryBytes = memoryData?.total_memory_bytes ?? null;

  return (
    <MetricCard
      title={i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.memoryLabel', {
        defaultMessage: 'Memory',
      })}
      subtitle={i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.totalLabel', {
        defaultMessage: 'Total',
      })}
      value={totalMemoryBytes}
      isLoading={loading}
      formatter="bytes"
    />
  );
};
