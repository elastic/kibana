/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CoreProviders } from '../../../apps/common_providers';
import type { IntegratedNodeMetricsTableProps, UseNodeMetricsTableOptions } from '../shared';
import { PodMetricsTable } from './pod_metrics_table';
import { usePodMetricsTable } from './use_pod_metrics_table';

function HookedPodMetricsTable({
  timerange,
  kuery,
  metricsClient,
  schema,
}: UseNodeMetricsTableOptions) {
  const podMetricsTableProps = usePodMetricsTable({ timerange, kuery, metricsClient, schema });
  return (
    <PodMetricsTable
      {...podMetricsTableProps}
      schema={schema}
      metricIndices={podMetricsTableProps.metricIndices}
    />
  );
}

function PodMetricsTableWithProviders({
  timerange,
  kuery,
  sourceId,
  metricsClient,
  schema,
  ...coreProvidersProps
}: IntegratedNodeMetricsTableProps) {
  return (
    <CoreProviders {...coreProvidersProps}>
      <HookedPodMetricsTable
        timerange={timerange}
        kuery={kuery}
        metricsClient={metricsClient}
        schema={schema}
      />
    </CoreProviders>
  );
}

// Use default export for lazy loading.
// eslint-disable-next-line import/no-default-export
export default PodMetricsTableWithProviders;
