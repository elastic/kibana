/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { Kpi } from './kpi';
import {
  useK8sContainerKpiCharts,
  useDockerContainerKpiCharts,
} from '../../hooks/use_container_metrics_charts';
import { useIntegrationCheck } from '../../hooks/use_integration_check';
import { INTEGRATIONS } from '../../constants';

export interface ContainerKpiChartsProps {
  dataView?: DataView;
  dateRange: TimeRange;
  query?: Query;
  filters?: Filter[];
  lastReloadRequestTime?: number;
  options?: {
    getSubtitle?: (formulaValue: string) => string;
  };
  loading?: boolean;
}

export const ContainerKpiCharts = ({
  dateRange,
  dataView,
  filters,
  query,
  lastReloadRequestTime,
  loading = false,
}: ContainerKpiChartsProps) => {
  const isDockerContainer = useIntegrationCheck({ dependsOn: INTEGRATIONS.docker });
  const isKubernetesContainer = useIntegrationCheck({
    dependsOn: INTEGRATIONS.kubernetesContainer,
  });
  if (!isDockerContainer && !isKubernetesContainer) {
    return null;
  }

  return (
    <>
      {isDockerContainer && (
        <DockerKpiCharts
          dateRange={dateRange}
          dataView={dataView}
          filters={filters}
          query={query}
          lastReloadRequestTime={lastReloadRequestTime}
          loading={loading}
        />
      )}
      {!isDockerContainer && isKubernetesContainer && (
        <KubernetesKpiCharts
          dateRange={dateRange}
          dataView={dataView}
          filters={filters}
          query={query}
          lastReloadRequestTime={lastReloadRequestTime}
          loading={loading}
        />
      )}
    </>
  );
};

const DockerKpiCharts = ({
  dateRange,
  dataView,
  filters,
  query,
  lastReloadRequestTime,
  loading = false,
}: ContainerKpiChartsProps) => {
  const charts = useDockerContainerKpiCharts({
    dataViewId: dataView?.id,
  });

  return (
    <>
      {charts.map((chartProps, index) => (
        <EuiFlexItem key={index}>
          <Kpi
            {...chartProps}
            dateRange={dateRange}
            filters={filters}
            query={query}
            lastReloadRequestTime={lastReloadRequestTime}
            loading={loading}
          />
        </EuiFlexItem>
      ))}
    </>
  );
};

const KubernetesKpiCharts = ({
  dateRange,
  dataView,
  filters,
  options,
  query,
  lastReloadRequestTime,
  loading = false,
}: ContainerKpiChartsProps) => {
  const charts = useK8sContainerKpiCharts({
    dataViewId: dataView?.id,
  });

  return (
    <>
      {charts.map((chartProps, index) => (
        <EuiFlexItem key={index}>
          <Kpi
            {...chartProps}
            dateRange={dateRange}
            filters={filters}
            query={query}
            lastReloadRequestTime={lastReloadRequestTime}
            loading={loading}
          />
        </EuiFlexItem>
      ))}
    </>
  );
};
