/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActiveMetricsVersion } from './active_metrics_version';
import type { ActiveFilter, PageFilters, SignalCardData, SignalCardId, TableView } from './data';
import { MetricChartsPanelV1 } from './metrics/v1/metric_charts_panel';
import { MetricChartsPanelV2 } from './metrics/v2/metric_charts_panel';
import { MetricChartsPanelV3 } from './metrics/v3/metric_charts_panel';
import { MetricChartsPanelV4 } from './metrics/v4/metric_charts_panel';
import { MetricChartsPanelV5 } from './metrics/v5/metric_charts_panel';
import { MetricChartsPanelV6 } from './metrics/v6/metric_charts_panel';

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
 * v.8 overview metrics router — swaps card layouts via the Metrics version
 * control. Prototype version still owns the rest of the page.
 *
 * Implementations live in `./metrics/vN/`. Simplified metrics is a switch on
 * the current version (no sparkline, no deltas), not a separate folder.
 */
export const MetricChartsPanel: React.FC<MetricChartsPanelProps> = (props) => {
  const [metricsVersion] = useActiveMetricsVersion();

  switch (metricsVersion) {
    case 'v6':
      return <MetricChartsPanelV6 key="v6" {...props} />;
    case 'v5':
      return <MetricChartsPanelV5 key="v5" {...props} />;
    case 'v4':
      return <MetricChartsPanelV4 key="v4" {...props} />;
    case 'v3':
      return <MetricChartsPanelV3 key="v3" {...props} />;
    case 'v2':
      return <MetricChartsPanelV2 key="v2" {...props} />;
    case 'v1':
    default:
      return <MetricChartsPanelV1 key="v1" {...props} />;
  }
};
