/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AreaSeries, Axis, Chart, CurveType, Position, ScaleType, Settings } from '@elastic/charts';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiIconTip,
  EuiLoadingSpinner,
  EuiPanel,
  EuiProgress,
  EuiSkeletonRectangle,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import { i18n } from '@kbn/i18n';

import { useSimplifiedMetrics } from '../../active_metrics_version';
import { usePrototypeStates } from '../../prototype_states';
import type { TileIssueIcon, TileView } from './tile_states';
import { getTileView, OVER_LIMIT_CARD_ID } from './tile_states';
import { usePrototypeStateToasts } from './tile_state_toasts';
import type { ActiveFilter, SignalCardData, SignalCardId } from '../../data';
import { useActiveTimeRange } from '../../active_time_range';
import type { FaceliftTimeRangeId } from '../../time_range';
import { FACELIFT_TIME_RANGES } from '../../time_range';
import { countStepsInWindow } from '../../signal_windows';
import {
  METRIC_CARD_GAP,
  METRIC_CARD_HEIGHT,
  SIMPLIFIED_METRIC_CARD_HEIGHT,
} from './metric_charts_layout';

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
 * Match Elastic Charts `Metric` defaults for a ~180px tile with Default density,
 * sized so a two-line title and two-line subtitle both fit above the value.
 * See `@elastic/charts` `text_measurements.js` + `.echMetricText` CSS.
 */
const VALUE_FONT_SIZE = 36;
const TITLE_FONT_SIZE = 14;
const SUBTITLE_FONT_SIZE = 12;
/** Match default EuiBadge content size (`euiFontSize('xs')`). */
const BADGE_FONT_SIZE = 12;
/** Match default EuiBadge height (line-height + borders ≈ 20px). */
const BADGE_HEIGHT = 20;
const TITLE_SUBTITLE_GAP = 6;
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
 * “vs. previous {window}” movement, scaled to the window being compared.
 *
 * This is the only authored input to the sparkline: the tile value is a live
 * corpus count, and `countStepsInWindow` draws the integer staircase that
 * opens at `value - delta` and closes at `value`, so the chart, the number and
 * the badge can never tell three different stories.
 */
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

/**
 * Mid-window peaks for the two cards whose populations are volatile by
 * nature: risk scores spike and settle, anomalies fire and clear. The number
 * is how many entities joined and left again beyond the higher of the window's
 * opening and closing values, so the series climbs past both and falls back to
 * the tile value. Net change and badge are unaffected; the peak only shows
 * that the current number is not the whole story.
 */
const CARD_PEAK_OVERSHOOTS: Record<FaceliftTimeRangeId, Partial<Record<SignalCardId, number>>> = {
  '24h': { riskMovers: 1, newAnomalies: 1 },
  '7d': { riskMovers: 2, newAnomalies: 1 },
  '30d': { riskMovers: 2, newAnomalies: 2 },
};

/** Title overrides (tooltip uses the same string). */
const V6_CARD_TITLES: Partial<Record<SignalCardId, string>> = {
  untriagedHighRisk: 'Severely alerting',
  newToCritical: 'Newly high-risk',
  riskMovers: 'Risk movers',
  newAndAlerting: 'New & alerting',
  newAnomalies: 'Anomalous',
  hiddenRisk: 'Watchlisted & alerting',
};

/** Subtitle / description overrides. */
const V6_CARD_DESCRIPTIONS: Partial<Record<SignalCardId, string>> = {
  untriagedHighRisk: 'Have at least one high- or critical-severity alert',
  newToCritical: 'Risk level climbed to high or critical',
  riskMovers: 'Risk score up by 10 or more',
  newAndAlerting: 'First seen in this period with at least one alert',
  newAnomalies: 'Flagged by at least one ML anomaly',
  hiddenRisk: 'On a watchlist with at least one alert in this period',
};

const displayTitleFor = (card: SignalCardData): string => V6_CARD_TITLES[card.id] ?? card.title;

const displayDescriptionFor = (card: SignalCardData): string =>
  V6_CARD_DESCRIPTIONS[card.id] ?? card.description;

const TREND_UPWARD = '\u{2191}';
const TREND_DOWNWARD = '\u{2193}';
const TREND_STABLE = '\u{003D}';

/**
 * Match Elastic Charts metric title/subtitle truncation
 * (`TitlesBlock` line-clamp in `@elastic/charts`).
 * Full-track v.1 cards are tall enough for 2 title lines + 2 subtitle lines.
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
const previousPeriodLabel = (range: FaceliftTimeRangeId) =>
  i18n.translate('xpack.securitySolution.entityAnalytics.facelift.signalCards.vsPreviousWindow', {
    defaultMessage: 'vs. previous {window}',
    values: { window: range },
  });

const MetricTrendBadge: React.FC<{ delta: number; timeRange: FaceliftTimeRangeId }> = ({
  delta,
  timeRange,
}) => {
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
        {previousPeriodLabel(timeRange)}
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
 *
 * The series is a headcount, so it is drawn as steps (the count holds until
 * the next entity arrives or leaves) over a y-axis anchored at zero: a +1 on
 * top of 3 fills a quarter more of the chart, not the whole of it.
 */
const Sparkline: React.FC<{ values: number[] }> = ({ values }) => {
  const { euiTheme } = useEuiTheme();
  const chartBaseTheme = useElasticChartsTheme();
  const fill = euiTheme.colors.backgroundBaseHighlighted;
  const stroke = euiTheme.colors.borderBaseDisabled;
  const data = useMemo(() => values.map((y, x) => ({ x, y })), [values]);
  const yDomain = useMemo(() => ({ min: 0, max: Math.max(1, ...values) }), [values]);

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
      {/* Hidden axis only pins the count scale to zero; no ticks, no grid. */}
      <Axis
        id="count"
        position={Position.Left}
        hide
        domain={yDomain}
        gridLine={{ visible: false }}
      />
      <AreaSeries
        id="trend"
        xScaleType={ScaleType.Linear}
        yScaleType={ScaleType.Linear}
        xAccessor="x"
        yAccessors={['y']}
        data={data}
        curve={CurveType.CURVE_STEP_AFTER}
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

/** “vs previous period” copy the product shows next to the delta spinner today. */
const TODAY_DELTA_LOADING_LABEL = 'vs previous period';

/** Count skeleton height; sits 8px above the change-badge skeleton. */
const COUNT_SKELETON_HEIGHT = 28;

/** Warning / error / info icon with its explanation in a tooltip. */
const IssueIconTip: React.FC<{ icon: TileIssueIcon; tooltip?: string; label: string }> = ({
  icon,
  tooltip,
  label,
}) => {
  const { euiTheme } = useEuiTheme();
  const color =
    icon === 'error' ? euiTheme.colors.textDanger : icon === 'warning' ? 'warning' : 'subdued';
  return (
    <EuiIconTip
      type={icon === 'info' ? 'info' : icon}
      color={color}
      size="s"
      content={tooltip}
      aria-label={tooltip ?? label}
      iconProps={{ 'data-test-subj': `eaFaceliftSignalCardIssueIcon-${icon}` }}
    />
  );
};

const TileCount: React.FC<{
  view: TileView['count'];
  value: number;
}> = ({ view, value }) => {
  const { euiTheme } = useEuiTheme();
  const valueCss = css`
    font-family: 'Elastic UI Numeric', ${euiTheme.font.family};
    font-size: ${VALUE_FONT_SIZE}px;
    font-weight: ${euiTheme.font.weight.bold};
    line-height: ${METRIC_LINE_HEIGHT};
    text-align: end;
    color: ${euiTheme.colors.textParagraph};
  `;

  switch (view.kind) {
    case 'spinner':
      return <EuiLoadingSpinner size="xl" data-test-subj="eaFaceliftSignalCardCountSpinner" />;
    case 'skeleton':
      return (
        <div
          css={css`
            margin-block-end: ${euiTheme.size.s};
          `}
        >
          <EuiSkeletonRectangle
            width={64}
            height={COUNT_SKELETON_HEIGHT}
            borderRadius="m"
            contentAriaLabel="Count"
            data-test-subj="eaFaceliftSignalCardCountSkeleton"
          />
        </div>
      );
    case 'unavailable':
      return (
        <EuiText css={valueCss} data-test-subj="eaFaceliftSignalCardUnavailable">
          {'N/A'}
        </EuiText>
      );
    case 'timedOut':
      return (
        <EuiText
          css={css`
            font-size: 20px;
            font-weight: ${euiTheme.font.weight.bold};
            line-height: ${METRIC_LINE_HEIGHT};
            color: ${euiTheme.colors.textParagraph};
          `}
          data-test-subj="eaFaceliftSignalCardTimedOut"
        >
          {'Timed out'}
        </EuiText>
      );
    case 'dash':
      return <EuiText css={valueCss}>{'—'}</EuiText>;
    case 'message':
      return (
        <div
          css={css`
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: ${euiTheme.size.xs};
            text-align: end;
          `}
          data-test-subj="eaFaceliftSignalCardMessage"
        >
          <EuiText size="xs" color="subdued">
            {view.lock ? (
              <EuiIcon
                type="lock"
                size="s"
                aria-hidden
                css={css`
                  margin-inline-end: ${euiTheme.size.xs};
                  vertical-align: -1px;
                `}
              />
            ) : null}
            {view.text}
          </EuiText>
        </div>
      );
    case 'value':
    default:
      return <EuiText css={valueCss}>{value.toLocaleString()}</EuiText>;
  }
};

const TileDelta: React.FC<{
  view: TileView['delta'];
  delta: number;
  timeRange: FaceliftTimeRangeId;
}> = ({ view, delta, timeRange }) => {
  const { euiTheme } = useEuiTheme();
  const labelCss = css`
    font-size: ${SUBTITLE_FONT_SIZE}px;
    line-height: ${METRIC_LINE_HEIGHT};
    color: ${euiTheme.colors.textSubdued};
    white-space: nowrap;
  `;
  const rowCss = css`
    display: inline-flex;
    align-items: center;
    gap: ${SECONDARY_METRIC_GAP}px;
    max-inline-size: 100%;
    min-block-size: ${BADGE_HEIGHT}px;
  `;

  switch (view.kind) {
    case 'spinner':
      return (
        <span css={rowCss} data-test-subj="eaFaceliftSignalCardDeltaSpinner">
          <EuiLoadingSpinner size="s" />
          <span css={labelCss}>{TODAY_DELTA_LOADING_LABEL}</span>
        </span>
      );
    case 'skeleton':
      return (
        <span css={rowCss} data-test-subj="eaFaceliftSignalCardDeltaSkeleton">
          <EuiSkeletonRectangle
            width={36}
            height={BADGE_HEIGHT}
            borderRadius="m"
            contentAriaLabel="Change"
          />
          <span css={labelCss}>{previousPeriodLabel(timeRange)}</span>
        </span>
      );
    case 'note':
      return (
        <span
          css={css`
            ${rowCss};
            text-align: end;
          `}
          data-test-subj="eaFaceliftSignalCardDeltaNote"
        >
          {view.icon ? (
            <IssueIconTip icon={view.icon} tooltip={view.tooltip} label={view.text} />
          ) : null}
          <span
            css={css`
              ${labelCss};
              white-space: normal;
            `}
          >
            {view.text}
          </span>
        </span>
      );
    case 'auto':
    case 'badge':
      return <MetricTrendBadge delta={delta} timeRange={timeRange} />;
    case 'hidden':
    default:
      return null;
  }
};

interface SignalMetricCardProps {
  card: SignalCardData;
  selected: boolean;
  /** Preset window from the KQL bar; picks the delta and sparkline shape. */
  timeRange: FaceliftTimeRangeId;
  onToggle: () => void;
  /** What the simulated prototype states put in each slot of this tile. */
  view: TileView;
}

/**
 * Custom Needs-attention KPI tile (EUI layout + Area sparkline). Whole-card
 * filter toggle with hover / active / all-clear states.
 *
 * Full-track v.1 drops the dimming earlier versions applied to unselected tiles while
 * a filter is active: only the selected tile changes, the rest keep their
 * default appearance.
 */
const SignalMetricCard: React.FC<SignalMetricCardProps> = ({
  card,
  selected,
  timeRange,
  onToggle,
  view,
}) => {
  const { euiTheme } = useEuiTheme();
  const [simplified] = useSimplifiedMetrics();
  const [hovered, setHovered] = useState(false);

  const value = view.value ?? card.value;
  const isZero = value === 0;
  const interactive = view.interactive ?? (view.count.kind === 'value' && !isZero);
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

  const authoredDelta = view.delta0 ?? CARD_DELTAS[timeRange][card.id] ?? card.delta ?? 0;
  const peakOvershoot = CARD_PEAK_OVERSHOOTS[timeRange][card.id] ?? 0;

  // Running headcount across the window: `value - delta` at the start, `value`
  // now, one whole step per entity that joined or left in between (with an
  // authored peak in between for the volatile cards).
  const trendSteps = useMemo(
    () =>
      countStepsInWindow({
        cardId: card.id,
        range: timeRange,
        value,
        delta: authoredDelta,
        samples: FACELIFT_TIME_RANGES[timeRange].trendPoints,
        peakOvershoot,
      }),
    [authoredDelta, card.id, value, peakOvershoot, timeRange]
  );
  // The badge quotes the movement the chart actually shows (identical to the
  // authored delta unless the opening value had to be clamped at zero).
  const delta = trendSteps.length > 0 ? value - trendSteps[0] : authoredDelta;
  const showDelta =
    !simplified &&
    (view.delta.kind === 'auto'
      ? interactive && !isZero && delta !== 0
      : view.delta.kind !== 'hidden');
  const showTrend =
    !simplified &&
    trendSteps.length > 1 &&
    (view.sparkline === 'show' || (view.sparkline === 'auto' && interactive));
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
      aria-disabled={!interactive || undefined}
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
        border-radius: ${euiTheme.border.radius.panel};
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
      {view.progress && !simplified ? (
        <EuiProgress
          size="xs"
          color="primary"
          position="absolute"
          data-test-subj="eaFaceliftSignalCardSparklineProgress"
          css={css`
            z-index: 2;
            inset-block-start: auto;
            inset-block-end: 0;
            border-radius: 0;
          `}
        />
      ) : null}
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
          <Sparkline values={trendSteps} />
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
          <EuiFlexItem
            grow={true}
            css={css`
              min-inline-size: 0;
            `}
          >
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
            <div
              css={css`
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                gap: ${DELTA_VALUE_GAP}px;
              `}
            >
              <TileCount view={view.count} value={value} />
              {showDelta ? (
                <TileDelta view={view.delta} delta={delta} timeRange={timeRange} />
              ) : null}
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </div>
  );

  if (!interactive) {
    return view.tooltip ? (
      <EuiToolTip
        content={view.tooltip}
        display="block"
        anchorProps={{
          css: css`
            block-size: 100%;
          `,
        }}
      >
        {cardNode}
      </EuiToolTip>
    ) : (
      cardNode
    );
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
}) => {
  const [timeRange] = useActiveTimeRange();
  const [simplified] = useSimplifiedMetrics();
  const [prototypeStates] = usePrototypeStates();
  const cardsHeight = simplified ? SIMPLIFIED_METRIC_CARD_HEIGHT : METRIC_CARD_HEIGHT;

  const selectedCardId = activeFilter?.type === 'card' ? activeFilter.cardId : undefined;
  usePrototypeStateToasts({ states: prototypeStates, timeRange, selectedCardId });

  // Picking the over-1,000 state selects its tile once; deselecting afterwards sticks.
  const latestSelection = useRef({ selectedCardId, onFilterForCard });
  latestSelection.current = { selectedCardId, onFilterForCard };
  useEffect(() => {
    const latest = latestSelection.current;
    if (prototypeStates.error === 'over1000' && latest.selectedCardId !== OVER_LIMIT_CARD_ID) {
      latest.onFilterForCard(OVER_LIMIT_CARD_ID);
    }
  }, [prototypeStates.error]);

  return (
    <EuiPanel
      hasBorder={false}
      hasShadow={false}
      paddingSize="none"
      data-test-subj="eaFaceliftSignalCards"
      css={css`
        block-size: ${cardsHeight}px;
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
        {cards.map((card, index) => {
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
                view={getTileView(card.id, card.value, prototypeStates, timeRange)}
              />
              {index === 0 && (
                // Zero-size product-tour anchor at the card's top-right corner. The tour
                // popover moves the anchor into its own wrapper, so it must be out of flow.
                <div
                  aria-hidden="true"
                  css={css`
                    position: absolute;
                    inset-block-start: 50%;
                    inset-inline-end: 0;
                    inline-size: 0;
                    block-size: 0;
                    line-height: 0;
                    pointer-events: none;
                  `}
                >
                  <span data-test-subj="eaFaceliftTourMetricsAnchor" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </EuiPanel>
  );
};
