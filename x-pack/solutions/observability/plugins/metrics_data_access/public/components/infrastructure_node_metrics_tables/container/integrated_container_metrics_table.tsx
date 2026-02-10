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
import type { ContainerSemconvRuntime } from './container_metrics_configs';
function HookedContainerMetricsTable({
  timerange,
  kuery,
  schema,
  semconvRuntime,
  metricsClient,
}: UseNodeMetricsTableOptions & { semconvRuntime?: ContainerSemconvRuntime }) {
  const containerMetricsTableProps = useContainerMetricsTable({
    timerange,
    kuery,
    schema,
    semconvRuntime,
    metricsClient,
  });
  return <ContainerMetricsTable {...containerMetricsTableProps} />;
}

function ContainerMetricsTableWithProviders({
  timerange,
  kuery,
  sourceId,
  schema,
  semconvRuntime,
  metricsClient,
  ...coreProvidersProps
}: IntegratedNodeMetricsTableProps & { semconvRuntime?: ContainerSemconvRuntime }) {
  return (
    <CoreProviders {...coreProvidersProps}>
      <HookedContainerMetricsTable
        timerange={timerange}
        kuery={kuery}
        schema={schema}
        metricsClient={metricsClient}
        semconvRuntime={semconvRuntime}
      />
    </CoreProviders>
  );
}

// Use default export for lazy loading.
// eslint-disable-next-line import/no-default-export
export default ContainerMetricsTableWithProviders;
