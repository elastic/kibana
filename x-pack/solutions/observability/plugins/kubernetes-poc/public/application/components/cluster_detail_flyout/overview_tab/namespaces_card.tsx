/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { TimeRange } from '@kbn/es-query';
import { useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useEsqlQuery } from '../../../../hooks/use_esql_query';
import { MetricCard } from './metric_card';

interface NamespacesCardProps {
  clusterName: string;
  timeRange: TimeRange;
  height?: number;
}

interface NamespacesData {
  namespace_count: number;
}

/**
 * ES|QL query for total number of namespaces in the cluster.
 */
const getNamespacesEsql = (clusterName: string) => `FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name == "${clusterName}" 
  AND k8s.namespace.name IS NOT NULL
| STATS namespace_count = COUNT_DISTINCT(k8s.namespace.name)`;

export const NamespacesCard: React.FC<NamespacesCardProps> = ({
  clusterName,
  timeRange,
  height = 100,
}) => {
  const { euiTheme } = useEuiTheme();
  const query = useMemo(() => getNamespacesEsql(clusterName), [clusterName]);

  const { data, loading } = useEsqlQuery<NamespacesData>({
    query,
    timeRange,
  });

  // Get the first row of results (single aggregation result)
  const namespacesData = data?.[0];
  const namespaceCount = namespacesData?.namespace_count ?? null;

  return (
    <MetricCard
      title={i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.namespacesLabel', {
        defaultMessage: 'Namespaces',
      })}
      value={namespaceCount}
      isLoading={loading}
      formatter="number"
      valueColor={euiTheme.colors.primary}
      height={height}
    />
  );
};
