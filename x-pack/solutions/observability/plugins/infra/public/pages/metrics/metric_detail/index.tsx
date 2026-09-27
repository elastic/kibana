/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useRouteMatch } from 'react-router-dom';
import type { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import { AssetDetailPage } from './asset_detail_page';
import { MetricDetailPage } from './metric_detail_page';
import { PodMetricDetailSchema } from './components/pod_metric_detail_schema';
import { MetricsTimeProvider } from './hooks/use_metrics_time';

export const NodeDetail = () => {
  const {
    params: { type: nodeType, node: nodeId },
  } = useRouteMatch<{ type: InventoryItemType; node: string }>();

  if (nodeType === 'host' || nodeType === 'container') {
    return <AssetDetailPage />;
  }

  if (nodeType === 'pod') {
    return (
      <MetricsTimeProvider>
        <PodMetricDetailSchema nodeId={nodeId} />
      </MetricsTimeProvider>
    );
  }

  return (
    <MetricsTimeProvider>
      <MetricDetailPage />
    </MetricsTimeProvider>
  );
};
