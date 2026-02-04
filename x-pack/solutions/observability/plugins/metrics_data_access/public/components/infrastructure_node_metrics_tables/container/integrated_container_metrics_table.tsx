/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CoreProviders } from '../../../apps/common_providers';
import type { IntegratedNodeMetricsTableProps, UseNodeMetricsTableOptions } from '../shared';
import { ContainerMetricsTable } from './container_metrics_table';
import { useContainerMetricsTable } from './use_container_metrics_table';

function HookedContainerMetricsTable({
  timerange,
  kuery,
  metricsClient,
}: UseNodeMetricsTableOptions) {
  const containerMetricsTableProps = useContainerMetricsTable({
    timerange,
    kuery,
    metricsClient,
  });
  return <ContainerMetricsTable {...containerMetricsTableProps} />;
}

function ContainerMetricsTableWithProviders({
  timerange,
  kuery,
  sourceId,
  metricsClient,
  ...coreProvidersProps
}: IntegratedNodeMetricsTableProps) {
  return (
    <CoreProviders {...coreProvidersProps}>
      <HookedContainerMetricsTable
        timerange={timerange}
        kuery={kuery}
        metricsClient={metricsClient}
      />
    </CoreProviders>
  );
}

// Use default export for lazy loading.
// eslint-disable-next-line import/no-default-export
export default ContainerMetricsTableWithProviders;
