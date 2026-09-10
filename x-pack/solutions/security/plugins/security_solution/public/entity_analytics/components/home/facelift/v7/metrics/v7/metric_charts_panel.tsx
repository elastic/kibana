/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';

import type { ActiveFilter, PageFilters, SignalCardData, SignalCardId, TableView } from '../../data';
import { SignalCards } from './signal_cards';
import { EntitiesByPanel } from './summary_charts';

/** 16px between the metrics grid and the Entities-by pie panel. */
const OVERVIEW_PANEL_GAP = 16;

export interface MetricChartsPanelV7Props {
  activeFilter: ActiveFilter | null;
  cards: SignalCardData[];
  pageFilters: PageFilters;
  tableView: TableView;
  onFilterForCard: (cardId: SignalCardId) => void;
  onFilterOutCard: (cardId: SignalCardId) => void;
  onAddCardToTimeline: (cardId: SignalCardId) => void;
}

/**
 * Metrics version v.7 — based on v.6 with regular-weight “vs previous period”
 * label (matching subtitle) and no gap between primary value and delta.
 */
export const MetricChartsPanelV7: React.FC<MetricChartsPanelV7Props> = ({
  activeFilter,
  cards,
  pageFilters,
  tableView,
  onFilterForCard,
  onFilterOutCard,
  onAddCardToTimeline,
}) => (
  <EuiFlexGroup
    gutterSize="none"
    responsive={false}
    alignItems="stretch"
    data-test-subj="eaFaceliftMetricChartsPanel"
    data-metrics-version="v6"
    css={css`
      gap: ${OVERVIEW_PANEL_GAP}px;
    `}
  >
    <EuiFlexItem
      grow={4}
      css={css`
        min-inline-size: 0;
        flex: 4 1 0;
      `}
    >
      <EntitiesByPanel pageFilters={pageFilters} tableView={tableView} />
    </EuiFlexItem>
    <EuiFlexItem
      grow={6}
      css={css`
        min-inline-size: 0;
        flex: 6 1 0;
      `}
    >
      <SignalCards
        activeFilter={activeFilter}
        cards={cards}
        onFilterForCard={onFilterForCard}
        onFilterOutCard={onFilterOutCard}
        onAddCardToTimeline={onAddCardToTimeline}
      />
    </EuiFlexItem>
  </EuiFlexGroup>
);
