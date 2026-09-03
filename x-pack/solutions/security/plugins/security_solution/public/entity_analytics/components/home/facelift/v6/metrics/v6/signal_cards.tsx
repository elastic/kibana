/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  AreaSeries,
  Chart,
  CurveType,
  ScaleType,
  Settings,
} from '@elastic/charts';
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
import { useElasticChartsTheme } from '@kbn/charts-theme';
import { i18n } from '@kbn/i18n';

import type { ActiveFilter, SignalCardData, SignalCardId } from '../../data';
import { expandTrendToThirtyDays } from '../../time_range';
import { METRIC_CARD_GAP, METRIC_CHARTS_BODY_HEIGHT } from './metric_charts_layout';

export interface SignalCardsProps {
  activeFilter: ActiveFilter | null;
  /** Card values for the current page filters — see `getSignalCards`. */
  cards: SignalCardData[];
  onFilterForCard: (cardId: SignalCardId) => void;
  /** Kept for MetricChartsPanel wiring; cards are whole-card toggles in v.6. */
  onFilterOutCard?: (cardId: SignalCardId) => void;
  onAddCardToTimeline?: (cardId: SignalCardId) => void;
}

/**
 * Needs-attention metrics panel height (matches Entities-by pie panel).
 */
const CARDS_HEIGHT = METRIC_CHARTS_BODY_HEIGHT;
/**
 * Match Elastic Charts `Metric` defaults for a ~156px tile with Default density
 * (`theme.metric.spacing: 'large'`, height breakpoint `xs`: 100–160px).
 * See `@elastic/charts` `text_measurements.js` + `.echMetricText` CSS.
 */
const VALUE_FONT_SIZE = 36;
const TITLE_FONT_SIZE = 16;
const SUBTITLE_FONT_SIZE = 13;
/** Match default EuiBadge content size (`euiFontSize('xs')`). */
const BADGE_FONT_SIZE = 12;
/** Match default EuiBadge height (line-height + borders ≈ 20px). */
const BADGE_HEIGHT = 20;
const TITLE_SUBTITLE_GAP = 8;
/** Metric `primaryAdjacentGap` for Default density. */
const DELTA_VALUE_GAP = 4;
/** Gap between secondary metric badge and label (`.echSecondaryMetric`). */
const SECONDARY_METRIC_GAP = 4;
const METRIC_LINE_HEIGHT = 1.2;
const DIMMED_OPACITY = 0.7;
const SPARKLINE_HEIGHT_RATIO = 0.5;
/** Metric `panelPadding` (Default density, `xs` breakpoint). */
const CARD_PADDING = 16;
/** Default sparkline fill when there is no delta: #2B394F at 8% opacity. */
const SPARKLINE_FILL = 'rgba(43, 57, 79, 0.08)';
/** Active-state sparkline fill when there is no delta: #002D80 at 12% opacity. */
const SPARKLINE_FILL_ACTIVE = 'rgba(0, 45, 128, 0.12)';

/**
 * v.6 metrics v.6 — same as v.5 with primary value above the delta row.
 * Most sparklines keep a clear direction; Risk movers and New anomalies use a
 * spike-then-drop shape (unclear trend).
 */
const V6_CARD_TRENDS: Record<SignalCardId, number[]> = {
  untriagedHighRisk: expandTrendToThirtyDays([6, 7, 7, 8, 8, 9, 10]),
  newToCritical: expandTrendToThirtyDays([2, 3, 3, 4, 5, 5, 6]),
  // Spike mid-window, then fall — still ends +4 vs start (matches delta).
  riskMovers: [
    6, 7, 6, 8, 9, 8, 10, 11, 13, 15, 17, 20, 24, 30, 36, 32, 26, 20, 16, 14, 13, 12, 11, 12, 11,
    11, 10, 10, 10, 10,
  ],
  newAndAlerting: expandTrendToThirtyDays([1, 2, 2, 3, 3, 4, 4]),
  // Early spike, then drop — ends −5 vs start (matches delta).
  newAnomalies: [
    37, 40, 46, 56, 70, 66, 54, 48, 44, 42, 40, 39, 38, 37, 36, 38, 37, 35, 34, 36, 35, 34, 33, 34,
    33, 33, 32, 32, 32, 32,
  ],
  hiddenRisk: expandTrendToThirtyDays([18, 16, 15, 14, 13, 13, 12]),
};

const V6_CARD_DELTAS: Partial<Record<SignalCardId, number>> = {
  untriagedHighRisk: 3,
  newToCritical: 2,
  riskMovers: 4,
  newAndAlerting: 1,
  newAnomalies: -5,
  hiddenRisk: -2,
};

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

const TREND_UPWARD = '\u{2191}';
const TREND_DOWNWARD = '\u{2193}';
const TREND_STABLE = '\u{003D}';

/**
 * Match Elastic Charts metric title/subtitle truncation
 * (`TitlesBlock` line-clamp in `@elastic/charts`).
 * At ~156px Default density Lens typically settles on 1 title + 1 subtitle line;
 * the title can still wrap once when the filter icon steals width.
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

interface TrendBadgeColors {
  backgroundColor: string;
  textColor: string;
  icon: string;
}

/**
 * Lens CompareTo secondary-metric palette (`getMappedSecondaryTrendPalettes`)
 * with Trend reversed: decrease → green, stable → grey, increase → red.
 */
const getTrendReversedBadgeColors = (
  delta: number,
  euiTheme: ReturnType<typeof useEuiTheme>['euiTheme']
): TrendBadgeColors => {
  // Unreversed CompareTo stops: [danger, text, success]. Reverse → [success, text, danger].
  const compareTo = {
    decrease: {
      backgroundColor: euiTheme.colors.backgroundLightDanger,
      textColor: euiTheme.colors.textDanger,
    },
    stable: {
      backgroundColor: euiTheme.colors.backgroundLightText,
      textColor: euiTheme.colors.textParagraph,
    },
    increase: {
      backgroundColor: euiTheme.colors.backgroundLightSuccess,
      textColor: euiTheme.colors.textSuccess,
    },
  };
  const reversed = {
    decrease: compareTo.increase,
    stable: compareTo.stable,
    increase: compareTo.decrease,
  };

  if (delta < 0) {
    return { ...reversed.decrease, icon: TREND_DOWNWARD };
  }
  if (delta > 0) {
    return { ...reversed.increase, icon: TREND_UPWARD };
  }
  return { ...reversed.stable, icon: TREND_STABLE };
};

/**
 * Elastic Charts secondary metric: trend badge + label after
 * (`labelPosition: 'after'`), matching Lens secondary-metric conventions.
 * Badge sizing follows default EuiBadge (~20px tall).
 */
const MetricTrendBadge: React.FC<{ delta: number }> = ({ delta }) => {
  const { euiTheme } = useEuiTheme();
  const { backgroundColor, textColor, icon } = getTrendReversedBadgeColors(delta, euiTheme);
  const sign = delta > 0 ? '+' : '';

  return (
    <span
      css={css`
        display: inline-flex;
        align-items: center;
        gap: ${SECONDARY_METRIC_GAP}px;
        max-inline-size: 100%;
        overflow: hidden;
        white-space: nowrap;
        font-weight: ${euiTheme.font.weight.medium};
      `}
      data-test-subj="eaFaceliftSignalCardDelta"
    >
      <span
        css={css`
          display: inline-flex;
          align-items: center;
          flex-shrink: 0;
          overflow: hidden;
          block-size: ${BADGE_HEIGHT}px;
          padding-inline: ${euiTheme.size.s};
          border: ${euiTheme.border.width.thin} solid transparent;
          border-radius: ${euiTheme.size.l};
          box-sizing: border-box;
          font-size: ${BADGE_FONT_SIZE}px;
          line-height: 1;
          font-weight: ${euiTheme.font.weight.medium};
        `}
        style={{ backgroundColor, color: textColor }}
        data-test-subj="eaFaceliftSignalCardDeltaBadge"
      >
        <span>{`${sign}${delta}`}</span>
        <span
          aria-hidden
          css={css`
            margin-inline-start: 4px;
          `}
        >
          {icon}
        </span>
      </span>
      <span
        css={css`
          min-inline-size: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: ${SUBTITLE_FONT_SIZE}px;
          line-height: ${METRIC_LINE_HEIGHT};
          color: ${euiTheme.colors.textSubdued};
        `}
        data-test-subj="eaFaceliftSignalCardDeltaLabel"
      >
        {i18n.translate(
          'xpack.securitySolution.entityAnalytics.facelift.signalCards.vsPreviousPeriod',
          { defaultMessage: 'vs previous period' }
        )}
      </span>
    </span>
  );
};

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

  // Match default filter chrome; selection is signaled by the accent dot only.
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

/** Decorative area sparkline behind the value — grey fill only, no peak line. */
const Sparkline: React.FC<{ values: number[]; fill: string }> = ({ values, fill }) => {
  const chartBaseTheme = useElasticChartsTheme();
  const data = useMemo(
    () => values.map((y, x) => ({ x, y })),
    [values]
  );

  if (values.length < 2) {
    return null;
  }

  return (
    <Chart size={['100%', '100%']}>
      <Settings
        baseTheme={chartBaseTheme}
        locale={i18n.getLocale()}
        showLegend={false}
        theme={{
          background: { color: 'transparent' },
          chartMargins: { left: 0, right: 0, top: 0, bottom: 0 },
          chartPaddings: { left: 0, right: 0, top: 0, bottom: 0 },
        }}
      />
      <AreaSeries
        id="trend"
        xScaleType={ScaleType.Linear}
        yScaleType={ScaleType.Linear}
        xAccessor="x"
        yAccessors={['y']}
        data={data}
        curve={CurveType.CURVE_MONOTONE_X}
        color={fill}
        areaSeriesStyle={{
          area: { opacity: 1, visible: true },
          line: { strokeWidth: 0, visible: false },
          point: { visible: 'never' },
        }}
      />
    </Chart>
  );
};

interface SignalMetricCardProps {
  card: SignalCardData;
  selected: boolean;
  dimmed: boolean;
  onToggle: () => void;
}

/**
 * Custom Needs-attention KPI tile (EUI layout + Area sparkline). Whole-card
 * filter toggle with hover / active / dimmed / all-clear states.
 */
const SignalMetricCard: React.FC<SignalMetricCardProps> = ({
  card,
  selected,
  dimmed,
  onToggle,
}) => {
  const { euiTheme } = useEuiTheme();
  const [hovered, setHovered] = useState(false);

  const isZero = card.value === 0;
  const interactive = !isZero;
  // Hover only — mouse clicks must not leave focus chrome that looks like hover after deselect.
  const emphasized = interactive && hovered;

  const defaultBg = euiTheme.colors.backgroundBasePlain;
  const hoverBg = euiTheme.colors.backgroundBaseSubdued;
  const activeBg = euiTheme.colors.backgroundBasePrimary;
  const defaultBorder = euiTheme.colors.borderBasePlain;
  const hoverBorder = euiTheme.colors.borderBaseProminent;
  const activeBorder = euiTheme.colors.borderStrongPrimary;

  // Active: primary base fill + strong primary border (sparkline tint unchanged).
  const tileBackground = selected ? activeBg : emphasized ? hoverBg : defaultBg;
  const borderColor = selected ? activeBorder : emphasized ? hoverBorder : defaultBorder;

  const delta = V6_CARD_DELTAS[card.id] ?? card.delta;
  const showDelta = interactive && !isZero && delta !== undefined && delta !== 0;
  // Always grey sparkline fill (default / selected), independent of delta color.
  const sparklineFill = selected ? SPARKLINE_FILL_ACTIVE : SPARKLINE_FILL;

  const trendKeyframes = V6_CARD_TRENDS[card.id] ?? card.trend;
  const showTrend = interactive && Boolean(trendKeyframes && trendKeyframes.length > 1);
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
        // Keep mouse activation from focusing the card, so deselection returns to
        // the default tile (not sticky focus-as-hover) when the pointer leaves.
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
        opacity: ${dimmed ? DIMMED_OPACITY : 1};
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
      {showTrend ? (
        <div
          aria-hidden
          css={css`
            position: absolute;
            inset-inline: 0;
            inset-block-end: 0;
            block-size: ${SPARKLINE_HEIGHT_RATIO * 100}%;
            pointer-events: none;
            z-index: 0;
          `}
        >
          <Sparkline values={trendKeyframes!} fill={sparklineFill} />
        </div>
      ) : null}

      <div
        css={css`
          position: relative;
          z-index: 1;
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
                ${metricLineClamp(1)}
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
            <div
              css={css`
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                gap: ${DELTA_VALUE_GAP}px;
              `}
            >
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
              {showDelta ? <MetricTrendBadge delta={delta!} /> : null}
            </div>
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
 * Needs-attention metrics as separate cards in a 2×3 grid (8px gaps).
 * Each card toggles an in-page table filter; selection stays on the card.
 */
export const SignalCards: React.FC<SignalCardsProps> = ({
  activeFilter,
  cards,
  onFilterForCard,
}) => {
  const anySelected = activeFilter?.type === 'card';

  return (
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
          grid-template-columns: repeat(3, minmax(0, 1fr));
          grid-template-rows: repeat(2, minmax(0, 1fr));
          gap: ${METRIC_CARD_GAP}px;
          block-size: 100%;
        `}
      >
        {cards.map((card) => {
          const selected = activeFilter?.type === 'card' && activeFilter.cardId === card.id;
          const dimmed = Boolean(anySelected && !selected);

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
                dimmed={dimmed}
                onToggle={() => onFilterForCard(card.id)}
              />
            </div>
          );
        })}
      </div>
    </EuiPanel>
  );
};
