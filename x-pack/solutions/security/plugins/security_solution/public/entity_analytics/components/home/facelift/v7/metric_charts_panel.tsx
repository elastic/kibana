/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActiveMetricsVersion } from './active_metrics_version';
import type { ActiveFilter, PageFilters, SignalCardData, SignalCardId, TableView } from './data';
import { MetricChartsPanelV7 } from './metrics/v7/metric_charts_panel';
import { MetricChartsPanelV8 } from './metrics/v8/metric_charts_panel';

export interface MetricChartsPanelProps {
  activeFilter: ActiveFilter | null;
  cards: SignalCardData[];
  pageFilters: PageFilters;
  tableView: TableView;
  onFilterForCard: (cardId: SignalCardId) => void;
  onFilterOutCard: (cardId: SignalCardId) => void;
  onAddCardToTimeline: (cardId: SignalCardId) => void;
}

/**
 * v.7 overview metrics router — swaps chart layouts via Metrics version (header).
 * Prototype version still owns the rest of the page.
 *
 * Implementations live in isolated `./metrics/vN/` folders so a single metrics
 * version can be handed off by deleting the other folders and trimming this switch.
 */
export const MetricChartsPanel: React.FC<MetricChartsPanelProps> = (props) => {
  const [metricsVersion] = useActiveMetricsVersion();

  switch (metricsVersion) {
    case 'v7':
      return <MetricChartsPanelV7 key="v7" {...props} />;
    case 'v8':
    default:
      return <MetricChartsPanelV8 key="v8" {...props} />;
  }
};
