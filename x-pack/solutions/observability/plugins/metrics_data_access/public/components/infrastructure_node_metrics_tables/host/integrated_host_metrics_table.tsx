/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CoreProviders } from '../../../apps/common_providers';
import type { IntegratedNodeMetricsTableProps } from '../shared';
import { HostMetricsTable } from './host_metrics_table';
import { useHostMetricsTable } from './use_host_metrics_table';

type HostIntegratedProps = Omit<IntegratedNodeMetricsTableProps, 'schema'> & {
  isOtel?: boolean;
};

type HookedHostMetricsTableProps = Pick<
  HostIntegratedProps,
  'timerange' | 'kuery' | 'isOtel' | 'metricsClient'
>;

function HookedHostMetricsTable({
  timerange,
  kuery,
  metricsClient,
  isOtel,
}: HookedHostMetricsTableProps) {
  const hostMetricsTableProps = useHostMetricsTable({ timerange, kuery, metricsClient, isOtel });
  return (
    <HostMetricsTable
      {...hostMetricsTableProps}
      isOtel={isOtel}
      metricIndices={hostMetricsTableProps.metricIndices}
    />
  );
}

function HostMetricsTableWithProviders({
  timerange,
  kuery,
  sourceId,
  metricsClient,
  isOtel,
  ...coreProvidersProps
}: HostIntegratedProps) {
  return (
    <CoreProviders {...coreProvidersProps}>
      <HookedHostMetricsTable
        timerange={timerange}
        kuery={kuery}
        metricsClient={metricsClient}
        isOtel={isOtel}
      />
    </CoreProviders>
  );
}

// Use default export for lazy loading.
// eslint-disable-next-line import/no-default-export
export default HostMetricsTableWithProviders;
