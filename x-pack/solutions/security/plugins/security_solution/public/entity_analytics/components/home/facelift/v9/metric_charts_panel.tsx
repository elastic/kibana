/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { ActiveFilter, PageFilters, SignalCardData, SignalCardId, TableView } from './data';
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
 * v.9 overview metrics: the metrics v.6 layout. Simplified metrics is a switch
 * on that layout (no sparkline, no deltas), not a separate folder.
 */
export const MetricChartsPanel: React.FC<MetricChartsPanelProps> = (props) => (
  <MetricChartsPanelV6 {...props} />
);
