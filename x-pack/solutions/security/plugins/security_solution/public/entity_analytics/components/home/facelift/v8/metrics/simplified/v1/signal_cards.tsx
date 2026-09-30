/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

import type { ActiveFilter, SignalCardData, SignalCardId } from '../../../data';
import { METRIC_CARD_GAP, METRIC_CARD_HEIGHT } from './metric_charts_layout';

export interface SignalCardsProps {
  activeFilter: ActiveFilter | null;
  /** Card values for the current page filters — see `getSignalCards`. */
  cards: SignalCardData[];
  onFilterForCard: (cardId: SignalCardId) => void;
  /** Kept for MetricChartsPanel wiring; cards are whole-card toggles. */
  onFilterOutCard?: (cardId: SignalCardId) => void;
  onAddCardToTimeline?: (cardId: SignalCardId) => void;
}

/** Needs-attention metrics panel height (one row of equal-width cards). */
const CARDS_HEIGHT = METRIC_CARD_HEIGHT;
/**
 * Match Elastic Charts `Metric` defaults for a compact tile with Default
 * density: two-line title and two-line subtitle above the value, no delta.
 */
const VALUE_FONT_SIZE = 36;
const TITLE_FONT_SIZE = 16;
const SUBTITLE_FONT_SIZE = 13;
const TITLE_SUBTITLE_GAP = 8;
const METRIC_LINE_HEIGHT = 1.2;
/** Metric `panelPadding` (Default density, `xs` breakpoint). */
const CARD_PADDING = 16;

/**
 * Simplified-track metrics v.1 — same tiles as the full-track v.1, without
 * sparkline backgrounds or period deltas. This folder is isolated so the look
 * can iterate without changing the full-track cards.
 */

/** Title overrides (tooltip uses the same string). */
const V6_CARD_TITLES: Partial<Record<SignalCardId, string>> = {
  untriagedHighRisk: 'Untriaged high-risk',
  newToCritical: 'New to critical',
  riskMovers: 'Risk movers',
  newAndAlerting: 'New & alerting',
  newAnomalies: 'New anomalies',
  hiddenRisk: 'Early warning',
};

/** Subtitle / description overrides. */
const V6_CARD_DESCRIPTIONS: Partial<Record<SignalCardId, string>> = {
  untriagedHighRisk: 'High/critical risk with uncased alerts',
  newToCritical: 'Crossed into critical risk',
  riskMovers: 'Risk spiked 20% or more',
  newAndAlerting: 'First seen this period, already alerting',
  newAnomalies: 'Flagged by new ML anomalies',
  hiddenRisk: 'Low/moderate risk with severe alerts',
};

const displayTitleFor = (card: SignalCardData): string =>
  V6_CARD_TITLES[card.id] ?? card.title;

const displayDescriptionFor = (card: SignalCardData): string =>
  V6_CARD_DESCRIPTIONS[card.id] ?? card.description;

/**
 * Match Elastic Charts metric title/subtitle truncation
 * (`TitlesBlock` line-clamp in `@elastic/charts`).
 */
const metricLineClamp = (maxLines: number) => css`
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: ${maxLines};
  -webkit-box-orient: vertical;
  white-space: pre-line;
  min-inline-size: 0;
`;

const filterTableTooltip = (title: string) =>
  i18n.translate('xpack.securitySolution.entityAnalytics.facelift.signalCards.filterTableTooltip', {
    defaultMessage: 'Filter table: {title}',
    values: { title },
  });

const unfilterTableTooltip = (title: string) =>
  i18n.translate(
    'xpack.securitySolution.entityAnalytics.facelift.signalCards.unfilterTableTooltip',
    {
      defaultMessage: 'Unfilter table: {title}',
      values: { title },
    }
  );

const CornerControl: React.FC<{
  selected: boolean;
  interactive: boolean;
  emphasized: boolean;
  onClear?: () => void;
}> = ({ selected, interactive, emphasized, onClear }) => {
  const { euiTheme } = useEuiTheme();

  if (!interactive) {
    return null;
  }

  const iconColor = emphasized ? 'primary' : euiTheme.colors.textSubdued;

  const icon = (
    <span
      css={css`
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        line-height: 0;
      `}
    >
      <EuiIcon type="filter" size="m" color={iconColor} aria-hidden />
      {selected ? (
        <EuiIcon
          type="dot"
          size="m"
          color="accent"
          aria-hidden
          css={css`
            position: absolute;
            inset-block-start: -8px;
            inset-inline-end: -8px;
            inline-size: 20px !important;
            block-size: 20px !important;
            pointer-events: none;
            stroke: ${euiTheme.colors.emptyShade};
            stroke-width: 1px;
            paint-order: stroke;
          `}
        />
      ) : null}
    </span>
  );

  if (selected && onClear) {
    return (
      <button
        type="button"
        aria-label={i18n.translate(
          'xpack.securitySolution.entityAnalytics.facelift.signalCards.clearFilter',
          { defaultMessage: 'Clear table filter' }
        )}
        data-test-subj="eaFaceliftSignalCardClearFilter"
        onMouseDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onClear();
        }}
        css={css`
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          border: 0;
          background: transparent;
          cursor: pointer;
        `}
      >
        {icon}
      </button>
    );
  }

  return icon;
};

interface SignalMetricCardProps {
  card: SignalCardData;
  selected: boolean;
  onToggle: () => void;
}

/**
 * Custom Needs-attention KPI tile without a sparkline or period delta.
 * Whole-card filter toggle with hover / active / all-clear states.
 */
const SignalMetricCard: React.FC<SignalMetricCardProps> = ({ card, selected, onToggle }) => {
  const { euiTheme } = useEuiTheme();
  const [hovered, setHovered] = useState(false);

  const isZero = card.value === 0;
  const interactive = !isZero;
  const emphasized = interactive && hovered;

  const defaultBg = euiTheme.colors.backgroundBasePlain;
  const hoverBg = euiTheme.colors.backgroundBaseSubdued;
  const activeBg = euiTheme.colors.backgroundBasePrimary;
  const defaultBorder = euiTheme.colors.borderBasePlain;
  const hoverBorder = euiTheme.colors.borderBaseProminent;
  const activeBorder = euiTheme.colors.borderStrongPrimary;

  const tileBackground = selected ? activeBg : emphasized ? hoverBg : defaultBg;
  const borderColor = selected ? activeBorder : emphasized ? hoverBorder : defaultBorder;

  const displayTitle = displayTitleFor(card);
  const displayDescription = displayDescriptionFor(card);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!interactive) {
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onToggle();
      }
    },
    [interactive, onToggle]
  );

  const cardNode = (
    <div
      role="button"
      tabIndex={interactive ? 0 : -1}
      aria-pressed={interactive ? selected : undefined}
      aria-disabled={isZero || undefined}
      aria-label={displayTitle}
      data-test-subj={`eaFaceliftSignalCard-${card.id}`}
      onClick={interactive ? onToggle : undefined}
      onKeyDown={onKeyDown}
      onMouseDown={(event) => {
        if (interactive && event.button === 0) {
          event.preventDefault();
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      css={css`
        display: flex;
        flex-direction: column;
        block-size: 100%;
        padding: ${CARD_PADDING}px;
        border: 1px solid ${borderColor};
        border-radius: ${euiTheme.border.radius.medium};
        background: ${tileBackground};
        cursor: ${interactive ? 'pointer' : 'default'};
        outline: none;
        overflow: hidden;
        position: relative;
        z-index: ${selected || emphasized ? 2 : 1};
        transition: border-color ${euiTheme.animation.fast} ${euiTheme.animation.resistance},
          background-color ${euiTheme.animation.fast} ${euiTheme.animation.resistance},
          opacity ${euiTheme.animation.fast} ${euiTheme.animation.resistance};

        &:focus-visible {
          border-color: ${selected ? activeBorder : hoverBorder};
        }
      `}
    >
      <div
        css={css`
          display: flex;
          flex-direction: column;
          flex: 1 1 auto;
          min-block-size: 0;
        `}
      >
        <EuiFlexGroup
          gutterSize="s"
          alignItems="flexStart"
          justifyContent="spaceBetween"
          responsive={false}
        >
          <EuiFlexItem grow={true} css={css`min-inline-size: 0;`}>
            <EuiText
              title={displayTitle}
              css={css`
                font-size: ${TITLE_FONT_SIZE}px;
                font-weight: ${euiTheme.font.weight.bold};
                line-height: ${METRIC_LINE_HEIGHT};
                ${metricLineClamp(2)}
              `}
            >
              {displayTitle}
            </EuiText>
            <EuiText
              color="subdued"
              title={displayDescription}
              css={css`
                margin-block-start: ${TITLE_SUBTITLE_GAP}px;
                font-size: ${SUBTITLE_FONT_SIZE}px;
                line-height: ${METRIC_LINE_HEIGHT};
                ${metricLineClamp(2)}
              `}
            >
              {displayDescription}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <CornerControl
              selected={selected}
              interactive={interactive}
              emphasized={emphasized}
              onClear={selected ? onToggle : undefined}
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        <div
          css={css`
            flex: 1 1 auto;
            min-block-size: ${euiTheme.size.m};
          `}
        />

        <EuiFlexGroup
          gutterSize="s"
          alignItems="flexEnd"
          justifyContent="flexEnd"
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <EuiText
              css={css`
                font-family: 'Elastic UI Numeric', ${euiTheme.font.family};
                font-size: ${VALUE_FONT_SIZE}px;
                font-weight: ${euiTheme.font.weight.bold};
                line-height: ${METRIC_LINE_HEIGHT};
                text-align: end;
                color: ${euiTheme.colors.textParagraph};
              `}
            >
              {card.value}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </div>
  );

  if (!interactive) {
    return cardNode;
  }

  return (
    <EuiToolTip
      content={selected ? unfilterTableTooltip(displayTitle) : filterTableTooltip(displayTitle)}
      display="block"
      anchorProps={{
        css: css`
          block-size: 100%;
        `,
      }}
    >
      {cardNode}
    </EuiToolTip>
  );
};

/**
 * Needs-attention metrics as separate cards in one equal-width row.
 * Each card toggles an in-page table filter; selection stays on the card.
 */
export const SignalCards: React.FC<SignalCardsProps> = ({
  activeFilter,
  cards,
  onFilterForCard,
}) => (
  <EuiPanel
    hasBorder={false}
    hasShadow={false}
    paddingSize="none"
    data-test-subj="eaFaceliftSignalCards"
    css={css`
      block-size: ${CARDS_HEIGHT}px;
      overflow: visible;
    `}
  >
    <div
      css={css`
        display: grid;
        grid-template-columns: repeat(${cards.length}, minmax(0, 1fr));
        grid-template-rows: minmax(0, 1fr);
        gap: ${METRIC_CARD_GAP}px;
        block-size: 100%;
      `}
    >
      {cards.map((card) => {
        const selected = activeFilter?.type === 'card' && activeFilter.cardId === card.id;

        return (
          <div
            key={card.id}
            css={css`
              min-inline-size: 0;
              min-block-size: 0;
              block-size: 100%;
              position: relative;
              z-index: ${selected ? 2 : 1};

              &:hover,
              &:focus-within {
                z-index: 2;
              }
            `}
          >
            <SignalMetricCard
              card={card}
              selected={selected}
              onToggle={() => onFilterForCard(card.id)}
            />
          </div>
        );
      })}
    </div>
  </EuiPanel>
);
