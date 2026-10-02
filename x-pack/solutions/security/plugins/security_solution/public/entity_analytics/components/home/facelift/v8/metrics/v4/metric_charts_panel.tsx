/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

import type {
  ActiveFilter,
  PageFilters,
  SignalCardData,
  SignalCardId,
  TableView,
} from '../../data';
import { getEntitiesNeedingAttentionCount } from '../../data';
import { useActiveTimeRange } from '../../active_time_range';
import { SignalCards } from './signal_cards';

const needsYourAttentionTitle = (count: number) =>
  i18n.translate('xpack.securitySolution.entityAnalytics.facelift.overview.needsYourAttention', {
    defaultMessage:
      '{count, plural, one {# entity needs your attention} other {# entities need your attention}}',
    values: { count },
  });

export interface MetricChartsPanelV4Props {
  activeFilter: ActiveFilter | null;
  cards: SignalCardData[];
  pageFilters: PageFilters;
  tableView: TableView;
  onFilterForCard: (cardId: SignalCardId) => void;
  onFilterOutCard: (cardId: SignalCardId) => void;
  onAddCardToTimeline: (cardId: SignalCardId) => void;
}

/**
 * Metrics version v.4 — v.2 cards and attention header, wrapped in a default
 * EuiPanel with 16px padding. Simplified metrics hides sparklines and deltas.
 */
export const MetricChartsPanelV4: React.FC<MetricChartsPanelV4Props> = ({
  activeFilter,
  cards,
  pageFilters,
  tableView,
  onFilterForCard,
  onFilterOutCard,
  onAddCardToTimeline,
}) => {
  const { euiTheme } = useEuiTheme();
  const [timeRange] = useActiveTimeRange();
  const entitiesNeedingAttention = useMemo(
    () => getEntitiesNeedingAttentionCount(pageFilters, tableView, timeRange),
    [pageFilters, tableView, timeRange]
  );

  return (
    <div data-test-subj="eaFaceliftMetricChartsPanel" data-metrics-version="v4">
      <EuiPanel paddingSize="m" hasShadow={false} hasBorder>
        <EuiFlexGroup
          direction="column"
          gutterSize="none"
          css={css`
            gap: 12px;
          `}
        >
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <h3
                data-test-subj="eaFaceliftNeedsAttentionTitle"
                css={css`
                  padding-left: ${euiTheme.size.xs};
                `}
              >
                {needsYourAttentionTitle(entitiesNeedingAttention)}
              </h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <SignalCards
              activeFilter={activeFilter}
              cards={cards}
              onFilterForCard={onFilterForCard}
              onFilterOutCard={onFilterOutCard}
              onAddCardToTimeline={onAddCardToTimeline}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </div>
  );
};
