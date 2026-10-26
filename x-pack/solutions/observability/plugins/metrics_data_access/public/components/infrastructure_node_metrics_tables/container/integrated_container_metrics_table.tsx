/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CoreProviders } from '../../../apps/common_providers';
import type { IntegratedNodeMetricsTableProps } from '../shared';
import { ContainerMetricsTable } from './container_metrics_table';
import { useContainerMetricsTable } from './use_container_metrics_table';
type ContainerIntegratedProps = IntegratedNodeMetricsTableProps & {
  isK8sContainer?: boolean;
};

type HookedContainerMetricsTableProps = Pick<
  ContainerIntegratedProps,
  'timerange' | 'kuery' | 'isOtel' | 'isK8sContainer' | 'metricsClient'
>;

function HookedContainerMetricsTable({
  timerange,
  kuery,
  isOtel,
  isK8sContainer,
  metricsClient,
}: HookedContainerMetricsTableProps) {
  const containerMetricsTableProps = useContainerMetricsTable({
    timerange,
    kuery,
    isOtel,
    isK8sContainer,
    metricsClient,
  });
  return (
    <ContainerMetricsTable
      {...containerMetricsTableProps}
      isOtel={isOtel}
      metricsIndices={containerMetricsTableProps.metricIndices}
      isK8sContainer={isK8sContainer}
    />
  );
}

function ContainerMetricsTableWithProviders({
  timerange,
  kuery,
  sourceId,
  isOtel,
  isK8sContainer,
  metricsClient,
  ...coreProvidersProps
}: ContainerIntegratedProps) {
  return (
    <CoreProviders {...coreProvidersProps}>
      <HookedContainerMetricsTable
        timerange={timerange}
        kuery={kuery}
        isOtel={isOtel}
        metricsClient={metricsClient}
        isK8sContainer={isK8sContainer}
      />
    </CoreProviders>
  );
}

// Use default export for lazy loading.
// eslint-disable-next-line import/no-default-export
export default ContainerMetricsTableWithProviders;
