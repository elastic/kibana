/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { ActiveFilter, PageFilters, SignalCardData, SignalCardId, TableView } from '../../../data';
import { SignalCards } from './signal_cards';

export interface MetricChartsPanelSimplifiedV1Props {
  activeFilter: ActiveFilter | null;
  cards: SignalCardData[];
  pageFilters: PageFilters;
  tableView: TableView;
  onFilterForCard: (cardId: SignalCardId) => void;
  onFilterOutCard: (cardId: SignalCardId) => void;
  onAddCardToTimeline: (cardId: SignalCardId) => void;
}

/**
 * Simplified-track metrics v.1 — same Needs-attention tiles as the full-track
 * v.1, without background charts or deltas. Isolated so this look can iterate
 * without changing the full-track cards.
 */
export const MetricChartsPanelSimplifiedV1: React.FC<MetricChartsPanelSimplifiedV1Props> = ({
  activeFilter,
  cards,
  onFilterForCard,
  onFilterOutCard,
  onAddCardToTimeline,
}) => (
  <div data-test-subj="eaFaceliftMetricChartsPanel" data-metrics-version="simplified-v1">
    <SignalCards
      activeFilter={activeFilter}
      cards={cards}
      onFilterForCard={onFilterForCard}
      onFilterOutCard={onFilterOutCard}
      onAddCardToTimeline={onAddCardToTimeline}
    />
  </div>
);
