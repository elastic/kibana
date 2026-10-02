/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiTitle, useEuiTheme } from '@elastic/eui';
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

export interface MetricChartsPanelV5Props {
  activeFilter: ActiveFilter | null;
  cards: SignalCardData[];
  pageFilters: PageFilters;
  tableView: TableView;
  onFilterForCard: (cardId: SignalCardId) => void;
  onFilterOutCard: (cardId: SignalCardId) => void;
  onAddCardToTimeline: (cardId: SignalCardId) => void;
}

/**
 * Metrics version v.5 — v.5 layout with 15px card titles, 13px
 * subtitles / period-delta copy, and an 8px title–subtitle gap.
 * Simplified metrics hides sparklines and deltas in place.
 */
export const MetricChartsPanelV5: React.FC<MetricChartsPanelV5Props> = ({
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
    <div
      data-test-subj="eaFaceliftMetricChartsPanel"
      data-metrics-version="v5"
      css={css`
        /* Cancel the 24px page gutter, then add 4px above the unchanged rule. */
        margin-block-start: -${euiTheme.size.l};
        padding-block-start: ${euiTheme.size.xs};
      `}
    >
      {/*
        Native EuiHorizontalRule (margin "s" is its 12px block margin).
        Inline style only cancels the page's 16px inset so the rule meets
        the page edges; it does not replace the component's own styles.
      */}
      <EuiHorizontalRule
        margin="s"
        style={{
          marginInline: `-${euiTheme.size.base}`,
          inlineSize: `calc(100% + ${euiTheme.size.base} * 2)`,
        }}
      />
      <EuiFlexGroup
        direction="column"
        gutterSize="none"
        css={css`
          gap: 12px;
        `}
      >
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h4
              data-test-subj="eaFaceliftNeedsAttentionTitle"
              css={css`
                padding-left: ${euiTheme.size.xs};
              `}
            >
              {needsYourAttentionTitle(entitiesNeedingAttention)}
            </h4>
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
    </div>
  );
};
