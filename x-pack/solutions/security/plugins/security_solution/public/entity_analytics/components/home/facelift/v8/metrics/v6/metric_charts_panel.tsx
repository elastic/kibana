/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

import type {
  ActiveFilter,
  PageFilters,
  SignalCardData,
  SignalCardId,
  TableView,
} from '../../data';
import { SignalCards } from './signal_cards';

const NEEDS_YOUR_ATTENTION_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.overview.entitiesThatNeedYourAttention',
  { defaultMessage: 'Entities that need your attention' }
);

const HOW_IT_WORKS_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.overview.howItWorks',
  { defaultMessage: 'How it works?' }
);

const onHowItWorksClick = () => {
  // Prototype-only control; no destination yet.
};

export interface MetricChartsPanelV6Props {
  activeFilter: ActiveFilter | null;
  cards: SignalCardData[];
  pageFilters: PageFilters;
  tableView: TableView;
  onFilterForCard: (cardId: SignalCardId) => void;
  onFilterOutCard: (cardId: SignalCardId) => void;
  onAddCardToTimeline: (cardId: SignalCardId) => void;
}

/**
 * Metrics version v.6 — v.5 layout with 14px card titles, 12px
 * subtitles / period-delta copy, and a 6px title–subtitle gap.
 * Simplified metrics hides sparklines and deltas in place.
 */
export const MetricChartsPanelV6: React.FC<MetricChartsPanelV6Props> = ({
  activeFilter,
  cards,
  onFilterForCard,
  onFilterOutCard,
  onAddCardToTimeline,
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      data-test-subj="eaFaceliftMetricChartsPanel"
      data-metrics-version="v6"
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
          gap: ${euiTheme.size.base};
        `}
      >
        <EuiFlexItem
          grow={false}
          css={css`
            padding-block-start: ${euiTheme.size.xs};
          `}
        >
          <EuiFlexGroup
            alignItems="center"
            justifyContent="spaceBetween"
            gutterSize="s"
            responsive={false}
          >
            <EuiFlexItem grow={true}>
              <EuiTitle size="xs">
                <h4
                  data-test-subj="eaFaceliftNeedsAttentionTitle"
                  css={css`
                    padding-left: ${euiTheme.size.xs};
                  `}
                >
                  {NEEDS_YOUR_ATTENTION_TITLE}
                </h4>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem
              grow={false}
              css={css`
                /* Keep the header row as tall as the title; the 32px small
                 * button is centered and does not grow the block. */
                block-size: ${euiTheme.size.l};
                overflow: visible;
                justify-content: center;
              `}
            >
              <EuiButtonEmpty
                size="s"
                iconType="popout"
                iconSide="right"
                flush="right"
                onClick={onHowItWorksClick}
                data-test-subj="eaFaceliftHowItWorksButton"
              >
                {HOW_IT_WORKS_LABEL}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
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
