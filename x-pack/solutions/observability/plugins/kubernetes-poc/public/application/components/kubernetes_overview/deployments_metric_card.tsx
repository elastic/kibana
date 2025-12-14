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

interface DeploymentsMetricCardProps {
  timeRange: TimeRange;
}

interface DeploymentsData {
  deployment_count: number;
}

/**
 * ES|QL query for total deployment count across all clusters
 */
const DEPLOYMENTS_ESQL = `FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name IS NOT NULL
  AND k8s.deployment.name IS NOT NULL
| STATS deployment_count = COUNT_DISTINCT(k8s.deployment.name)`;

export const DeploymentsMetricCard: React.FC<DeploymentsMetricCardProps> = ({ timeRange }) => {
  const { euiTheme } = useEuiTheme();
  const { data, loading } = useEsqlQuery<DeploymentsData>({
    query: DEPLOYMENTS_ESQL,
    timeRange,
  });

  const deploymentsData = data?.[0];
  const deploymentCount = deploymentsData?.deployment_count ?? null;

  return (
    <MetricCard
      title={i18n.translate('xpack.kubernetesPoc.kubernetesOverview.deploymentsLabel', {
        defaultMessage: 'Deployments',
      })}
      value={deploymentCount}
      isLoading={loading}
      formatter="number"
      valueColor={euiTheme.colors.primary}
    />
  );
};
