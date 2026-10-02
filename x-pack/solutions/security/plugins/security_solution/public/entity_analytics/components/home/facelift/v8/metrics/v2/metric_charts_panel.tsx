/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { ActiveFilter, PageFilters, SignalCardData, SignalCardId, TableView } from '../../data';
import { SignalCards } from './signal_cards';

export interface MetricChartsPanelV2Props {
  activeFilter: ActiveFilter | null;
  cards: SignalCardData[];
  pageFilters: PageFilters;
  tableView: TableView;
  onFilterForCard: (cardId: SignalCardId) => void;
  onFilterOutCard: (cardId: SignalCardId) => void;
  onAddCardToTimeline: (cardId: SignalCardId) => void;
}

/**
 * Metrics version v.2 — snapshot of the former v.1 look: sparkline backgrounds,
 * period deltas, and the attention header. Simplified metrics hides those
 * charts and deltas in place.
 */
export const MetricChartsPanelV2: React.FC<MetricChartsPanelV2Props> = ({
  activeFilter,
  cards,
  onFilterForCard,
  onFilterOutCard,
  onAddCardToTimeline,
}) => (
  <div data-test-subj="eaFaceliftMetricChartsPanel" data-metrics-version="v2">
    <SignalCards
      activeFilter={activeFilter}
      cards={cards}
      onFilterForCard={onFilterForCard}
      onFilterOutCard={onFilterOutCard}
      onAddCardToTimeline={onAddCardToTimeline}
    />
  </div>
);
