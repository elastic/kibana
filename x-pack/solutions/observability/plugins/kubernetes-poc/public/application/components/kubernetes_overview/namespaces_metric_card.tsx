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

interface NamespacesMetricCardProps {
  timeRange: TimeRange;
}

interface NamespacesData {
  namespace_count: number;
}

/**
 * ES|QL query for total namespace count across all clusters
 */
const NAMESPACES_ESQL = `FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name IS NOT NULL
  AND k8s.namespace.name IS NOT NULL
| STATS namespace_count = COUNT_DISTINCT(k8s.namespace.name)`;

export const NamespacesMetricCard: React.FC<NamespacesMetricCardProps> = ({ timeRange }) => {
  const { euiTheme } = useEuiTheme();
  const { data, loading } = useEsqlQuery<NamespacesData>({
    query: NAMESPACES_ESQL,
    timeRange,
  });

  const namespacesData = data?.[0];
  const namespaceCount = namespacesData?.namespace_count ?? null;

  return (
    <MetricCard
      title={i18n.translate('xpack.kubernetesPoc.kubernetesOverview.namespacesLabel', {
        defaultMessage: 'Namespaces',
      })}
      value={namespaceCount}
      isLoading={loading}
      formatter="number"
      valueColor={euiTheme.colors.primary}
    />
  );
};
