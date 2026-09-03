/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { ActiveFilter, PageFilters, SignalCardData, SignalCardId, TableView } from './data';
import { MetricChartsPanelV1 } from './metrics/v1/metric_charts_panel';

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
 * v.5 overview metrics — fixed metrics v.1 look (no Metrics version switcher).
 * Metrics versioning lives on prototype v.6 only.
 */
export const MetricChartsPanel: React.FC<MetricChartsPanelProps> = (props) => (
  <MetricChartsPanelV1 {...props} />
);
