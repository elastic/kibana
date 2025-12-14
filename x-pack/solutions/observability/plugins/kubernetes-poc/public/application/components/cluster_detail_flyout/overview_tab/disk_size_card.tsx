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

interface DiskSizeCardProps {
  clusterName: string;
  timeRange: TimeRange;
}

interface DiskSizeData {
  total_disk_bytes: number;
}

/**
 * ES|QL query for total disk capacity across all nodes in the cluster.
 * Sums the maximum filesystem capacity per node.
 */
const getDiskSizeEsql = (clusterName: string) => `FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name == "${clusterName}" 
  AND k8s.node.name IS NOT NULL
  AND k8s.node.filesystem.capacity IS NOT NULL
| STATS 
    disk_capacity = MAX(k8s.node.filesystem.capacity)
  BY k8s.node.name
| STATS total_disk_bytes = SUM(disk_capacity)`;

export const DiskSizeCard: React.FC<DiskSizeCardProps> = ({ clusterName, timeRange }) => {
  const query = useMemo(() => getDiskSizeEsql(clusterName), [clusterName]);

  const { data, loading } = useEsqlQuery<DiskSizeData>({
    query,
    timeRange,
  });

  // Get the first row of results (single aggregation result)
  const diskSizeData = data?.[0];
  const totalDiskBytes = diskSizeData?.total_disk_bytes ?? null;

  return (
    <MetricCard
      title={i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.diskSizeLabel', {
        defaultMessage: 'Disk size',
      })}
      subtitle={i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.totalLabel', {
        defaultMessage: 'Total',
      })}
      value={totalDiskBytes}
      isLoading={loading}
      formatter="bytes"
    />
  );
};
