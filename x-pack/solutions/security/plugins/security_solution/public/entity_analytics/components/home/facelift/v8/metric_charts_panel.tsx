/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActiveMetricsVersion, useSimplifiedMetrics } from './active_metrics_version';
import type { ActiveFilter, PageFilters, SignalCardData, SignalCardId, TableView } from './data';
import { MetricChartsPanelV1 } from './metrics/v1/metric_charts_panel';
import { MetricChartsPanelSimplifiedV1 } from './metrics/simplified/v1/metric_charts_panel';

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
 * v.8 overview metrics router — swaps chart layouts via the Simplified metrics
 * switch and the Metrics version header control. Prototype version still owns
 * the rest of the page.
 *
 * Full-track implementations live in `./metrics/vN/`; simplified-track ones in
 * `./metrics/simplified/vN/`. Each track's v.1 is independent so visuals can
 * iterate without copying the whole page.
 */
export const MetricChartsPanel: React.FC<MetricChartsPanelProps> = (props) => {
  // Track + version both come from the v.8 chrome header.
  const [simplified] = useSimplifiedMetrics();
  const [metricsVersion] = useActiveMetricsVersion();

  if (simplified) {
    switch (metricsVersion) {
      case 'v1':
      default:
        return <MetricChartsPanelSimplifiedV1 key="simplified-v1" {...props} />;
    }
  }

  switch (metricsVersion) {
    case 'v1':
    default:
      return <MetricChartsPanelV1 key="v1" {...props} />;
  }
};
