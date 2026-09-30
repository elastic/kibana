/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { ActiveFilter, PageFilters, SignalCardData, SignalCardId, TableView } from '../../data';
import { SignalCards } from './signal_cards';

export interface MetricChartsPanelV1Props {
  activeFilter: ActiveFilter | null;
  cards: SignalCardData[];
  pageFilters: PageFilters;
  tableView: TableView;
  onFilterForCard: (cardId: SignalCardId) => void;
  onFilterOutCard: (cardId: SignalCardId) => void;
  onAddCardToTimeline: (cardId: SignalCardId) => void;
}

/**
 * Metrics version v.1 (full track) — the former metrics v.8 look: sparkline
 * backgrounds and period deltas. Isolated from the simplified-track v.1.
 */
export const MetricChartsPanelV1: React.FC<MetricChartsPanelV1Props> = ({
  activeFilter,
  cards,
  onFilterForCard,
  onFilterOutCard,
  onAddCardToTimeline,
}) => (
  <div data-test-subj="eaFaceliftMetricChartsPanel" data-metrics-version="v1">
    <SignalCards
      activeFilter={activeFilter}
      cards={cards}
      onFilterForCard={onFilterForCard}
      onFilterOutCard={onFilterOutCard}
      onAddCardToTimeline={onAddCardToTimeline}
    />
  </div>
);
