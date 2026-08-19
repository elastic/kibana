/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { ActiveFilter, SignalCardData, SignalCardId } from './data';
import { SignalCards } from './signal_cards';

export interface MetricChartsPanelProps {
  activeFilter: ActiveFilter | null;
  cards: SignalCardData[];
  onFilterForCard: (cardId: SignalCardId) => void;
  onFilterOutCard: (cardId: SignalCardId) => void;
  onAddCardToTimeline: (cardId: SignalCardId) => void;
}

/**
 * Needs-attention metrics only (v.4): no accordion chrome and no Summary tab.
 */
export const MetricChartsPanel: React.FC<MetricChartsPanelProps> = ({
  activeFilter,
  cards,
  onFilterForCard,
  onFilterOutCard,
  onAddCardToTimeline,
}) => (
  <div data-test-subj="eaFaceliftMetricChartsPanel">
    <SignalCards
      activeFilter={activeFilter}
      cards={cards}
      onFilterForCard={onFilterForCard}
      onFilterOutCard={onFilterOutCard}
      onAddCardToTimeline={onAddCardToTimeline}
    />
  </div>
);
