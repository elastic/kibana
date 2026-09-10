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
import { useActiveTimeRange } from '../../active_time_range';
import type { FaceliftTimeRangeId } from '../../time_range';
import { FACELIFT_TIME_RANGES, expandTrend } from '../../time_range';
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
/** No gap between primary value and delta row (v.7). */
const DELTA_VALUE_GAP = 0;
/** Gap between secondary metric badge and label (`.echSecondaryMetric`). */
const SECONDARY_METRIC_GAP = 4;
const METRIC_LINE_HEIGHT = 1.2;
const SPARKLINE_HEIGHT_RATIO = 0.5;
/** Metric `panelPadding` (Default density, `xs` breakpoint). */
const CARD_PADDING = 16;
/** Peak line on the decorative sparkline. */
const SPARKLINE_LINE_WIDTH = 1;

/**
 * Metrics v.8 — same tiles as v.7, without the dimming of unselected cards.
 * Most sparklines keep a clear direction; Risk movers and New anomalies use a
 * spike-then-drop shape (unclear trend).
 *
 * One keyframe shape per card per preset window (v.7 KQL-bar button group).
 * Keyframes are stretched to the window's sample count — hourly across 24h,
 * daily across 7d and 30d — so a narrower window reads as a shorter, flatter
 * story rather than the same 30-day curve relabelled. The 30d shapes are the
 * originals, so the default view is unchanged.
 */
const CARD_TREND_KEYFRAMES: Record<FaceliftTimeRangeId, Record<SignalCardId, number[]>> = {
  '24h': {
    untriagedHighRisk: [3, 3, 4, 4, 4, 5, 5],
    newToCritical: [0, 1, 1, 1, 2, 2, 2],
    // Spike mid-window, then settle — direction stays unclear at every window.
    riskMovers: [2, 3, 5, 8, 6, 4, 3],
    newAndAlerting: [1, 1, 2, 2, 2, 3, 3],
    // Early spike, then drop.
    newAnomalies: [4, 6, 9, 7, 5, 4, 3],
    hiddenRisk: [4, 4, 3, 3, 3, 2, 2],
  },
  '7d': {
    untriagedHighRisk: [5, 6, 6, 7, 7, 8, 8],
    newToCritical: [1, 1, 2, 2, 2, 3, 3],
    riskMovers: [4, 6, 9, 14, 10, 7, 6],
    newAndAlerting: [1, 2, 2, 3, 3, 3, 4],
    newAnomalies: [16, 22, 30, 24, 19, 17, 16],
    hiddenRisk: [9, 8, 8, 7, 7, 6, 6],
  },
  '30d': {
    untriagedHighRisk: [6, 7, 7, 8, 8, 9, 10],
    newToCritical: [2, 3, 3, 4, 5, 5, 6],
    // Spike mid-window, then fall — still ends +4 vs start (matches delta).
    riskMovers: [
      6, 7, 6, 8, 9, 8, 10, 11, 13, 15, 17, 20, 24, 30, 36, 32, 26, 20, 16, 14, 13, 12, 11, 12, 11,
      11, 10, 10, 10, 10,
    ],
    newAndAlerting: [1, 2, 2, 3, 3, 4, 4],
    // Early spike, then drop — ends −5 vs start (matches delta).
    newAnomalies: [
      37, 40, 46, 56, 70, 66, 54, 48, 44, 42, 40, 39, 38, 37, 36, 38, 37, 35, 34, 36, 35, 34, 33,
      34, 33, 33, 32, 32, 32, 32,
    ],
    hiddenRisk: [18, 16, 15, 14, 13, 13, 12],
  },
};

/** “vs previous period” movement, scaled to the window being compared. */
const CARD_DELTAS: Record<FaceliftTimeRangeId, Partial<Record<SignalCardId, number>>> = {
  '24h': {
    untriagedHighRisk: 1,
    newToCritical: 1,
    riskMovers: 1,
    newAndAlerting: 1,
    newAnomalies: -2,
    hiddenRisk: -1,
  },
  '7d': {
    untriagedHighRisk: 2,
    newToCritical: 1,
    riskMovers: 2,
    newAndAlerting: 1,
    newAnomalies: -3,
    hiddenRisk: -1,
  },
  '30d': {
    untriagedHighRisk: 3,
    newToCritical: 2,
    riskMovers: 4,
    newAndAlerting: 1,
    newAnomalies: -5,
    hiddenRisk: -2,
  },
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
          font-weight: ${euiTheme.font.weight.regular};
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

/**
 * Decorative area sparkline behind the value: highlighted fill with a 1px
 * peak line on top (`borderBaseDisabled` over `backgroundBaseHighlighted`).
 */
const Sparkline: React.FC<{ values: number[] }> = ({ values }) => {
  const { euiTheme } = useEuiTheme();
  const chartBaseTheme = useElasticChartsTheme();
  const fill = euiTheme.colors.backgroundBaseHighlighted;
  const stroke = euiTheme.colors.borderBaseDisabled;
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
          // Room at the top so the peak line is not clipped.
          chartPaddings: { left: 0, right: 0, top: SPARKLINE_LINE_WIDTH, bottom: 0 },
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
        color={stroke}
        areaSeriesStyle={{
          area: { opacity: 1, visible: true, fill },
          line: { strokeWidth: SPARKLINE_LINE_WIDTH, visible: true, stroke },
          point: { visible: 'never' },
        }}
      />
    </Chart>
  );
};

interface SignalMetricCardProps {
  card: SignalCardData;
  selected: boolean;
  /** Preset window from the KQL bar; picks the delta and sparkline shape. */
  timeRange: FaceliftTimeRangeId;
  onToggle: () => void;
}

/**
 * Custom Needs-attention KPI tile (EUI layout + Area sparkline). Whole-card
 * filter toggle with hover / active / all-clear states.
 *
 * v.8 drops the dimming the earlier versions applied to unselected tiles while
 * a filter is active: only the selected tile changes, the rest keep their
 * default appearance.
 */
const SignalMetricCard: React.FC<SignalMetricCardProps> = ({
  card,
  selected,
  timeRange,
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

  const delta = CARD_DELTAS[timeRange][card.id] ?? card.delta;
  const showDelta = interactive && !isZero && delta !== undefined && delta !== 0;

  const trendKeyframes = useMemo(() => {
    const keyframes = CARD_TREND_KEYFRAMES[timeRange][card.id] ?? card.trend;
    return keyframes
      ? expandTrend(keyframes, FACELIFT_TIME_RANGES[timeRange].trendPoints)
      : undefined;
  }, [card.id, card.trend, timeRange]);
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
          <Sparkline values={trendKeyframes!} />
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
  const [timeRange] = useActiveTimeRange();

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
                timeRange={timeRange}
                onToggle={() => onFilterForCard(card.id)}
              />
            </div>
          );
        })}
      </div>
    </EuiPanel>
  );
};
