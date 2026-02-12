/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import React, { lazy, Suspense } from 'react';
import type { MetricsDataClient } from '../../../lib/metrics_client';
import type { NodeMetricsTableProps } from '../shared';

const LazyIntegratedPodMetricsTable = lazy(() => import('./integrated_pod_metrics_table'));

export function createLazyPodMetricsTable(core: CoreStart, metricsClient: MetricsDataClient) {
  return ({ timerange, kuery, sourceId }: NodeMetricsTableProps) => {
    return (
      <Suspense fallback={null}>
        <LazyIntegratedPodMetricsTable
          core={core}
          metricsClient={metricsClient}
          sourceId={sourceId || 'default'}
          timerange={timerange}
          kuery={kuery}
        />
      </Suspense>
    );
  };
}
