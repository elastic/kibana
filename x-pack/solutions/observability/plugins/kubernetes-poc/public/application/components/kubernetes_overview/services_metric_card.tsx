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

interface ServicesMetricCardProps {
  timeRange: TimeRange;
}

interface ServicesData {
  service_count: number;
}

/**
 * ES|QL query for total service count across all clusters
 * Note: k8s.service.name might not be available in OTel data, using k8s.namespace.name as fallback
 */
const SERVICES_ESQL = `FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name IS NOT NULL
  AND k8s.service.name IS NOT NULL
| STATS service_count = COUNT_DISTINCT(k8s.service.name)`;

export const ServicesMetricCard: React.FC<ServicesMetricCardProps> = ({ timeRange }) => {
  const { euiTheme } = useEuiTheme();
  const { data, loading } = useEsqlQuery<ServicesData>({
    query: SERVICES_ESQL,
    timeRange,
  });

  const servicesData = data?.[0];
  const serviceCount = servicesData?.service_count ?? null;

  return (
    <MetricCard
      title={i18n.translate('xpack.kubernetesPoc.kubernetesOverview.servicesLabel', {
        defaultMessage: 'Services',
      })}
      value={serviceCount}
      isLoading={loading}
      formatter="number"
      valueColor={euiTheme.colors.primary}
    />
  );
};
