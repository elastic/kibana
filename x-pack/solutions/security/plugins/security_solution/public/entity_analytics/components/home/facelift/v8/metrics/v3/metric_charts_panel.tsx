/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { ActiveFilter, PageFilters, SignalCardData, SignalCardId, TableView } from '../../data';
import { SignalCards } from './signal_cards';

export interface MetricChartsPanelV3Props {
  activeFilter: ActiveFilter | null;
  cards: SignalCardData[];
  pageFilters: PageFilters;
  tableView: TableView;
  onFilterForCard: (cardId: SignalCardId) => void;
  onFilterOutCard: (cardId: SignalCardId) => void;
  onAddCardToTimeline: (cardId: SignalCardId) => void;
}

/**
 * Metrics version v.3 — v.2 cards with a heading-4 attention header and 2px
 * smaller card titles. Simplified metrics hides sparklines and deltas in place.
 */
export const MetricChartsPanelV3: React.FC<MetricChartsPanelV3Props> = ({
  activeFilter,
  cards,
  onFilterForCard,
  onFilterOutCard,
  onAddCardToTimeline,
}) => (
  <div data-test-subj="eaFaceliftMetricChartsPanel" data-metrics-version="v3">
    <SignalCards
      activeFilter={activeFilter}
      cards={cards}
      onFilterForCard={onFilterForCard}
      onFilterOutCard={onFilterOutCard}
      onAddCardToTimeline={onAddCardToTimeline}
    />
  </div>
);
