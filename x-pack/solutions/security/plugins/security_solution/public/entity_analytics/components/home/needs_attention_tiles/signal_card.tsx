/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { AreaSeries, Axis, Chart, CurveType, Position, ScaleType, Settings } from '@elastic/charts';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiText,
  EuiToolTip,
  useEuiFontSize,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import { i18n } from '@kbn/i18n';

import type { SignalCardData } from './data';

export interface SignalCardProps {
  card: SignalCardData;
  selected: boolean;
  onToggle: () => void;
}

/** The Metric chart's default value size; no EUI font-size token is this large (`xxl` is 30px). */
const VALUE_FONT_SIZE = 36;
/** Match default EuiBadge height (line-height + borders ≈ 20px); no EUI size token is 20px. */
const BADGE_HEIGHT = 20;
/** Gap between title and subtitle; between the `xs` (4px) and `s` (8px) size tokens. */
const TITLE_SUBTITLE_GAP = 6;
/** No gap between primary value and delta row. */
const DELTA_VALUE_GAP = 0;
const METRIC_LINE_HEIGHT = 1.2;
const SPARKLINE_HEIGHT_RATIO = 0.5;
/** Floor for the tile height, as a multiple of the `xxxxl` size token (176px with Borealis). */
const MIN_HEIGHT_FACTOR = 2.75;
/** Peak line on the decorative sparkline. */
const SPARKLINE_LINE_WIDTH = 1;
/** Diameter of the "filter selected" accent dot. */
const SELECTED_DOT_SIZE = 20;
/** How far the dot sits outside the filter icon's top-right corner. */
const SELECTED_DOT_OFFSET = 8;

const TREND_UPWARD = '\u{2191}';
const TREND_DOWNWARD = '\u{2193}';

const notEnoughHistory = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.signalCard.deltaNoHistory',
  { defaultMessage: 'Not enough history to compare' }
);

const vsPreviousPeriod = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.signalCard.vsPreviousPeriod',
  { defaultMessage: 'vs previous period' }
);

/** Matches Elastic Charts metric title/subtitle truncation (line clamp). */
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
 * Lens CompareTo secondary-metric palette with Trend reversed: for these tiles an increase is
 * bad (red) and a decrease is good (green).
 */
const getTrendReversedBadgeColors = (
  delta: number,
  euiTheme: ReturnType<typeof useEuiTheme>['euiTheme']
): TrendBadgeColors =>
  delta < 0
    ? {
        backgroundColor: euiTheme.colors.backgroundLightSuccess,
        textColor: euiTheme.colors.textSuccess,
        icon: TREND_DOWNWARD,
      }
    : {
        backgroundColor: euiTheme.colors.backgroundLightDanger,
        textColor: euiTheme.colors.textDanger,
        icon: TREND_UPWARD,
      };

/** From this size on, a tile number is shortened: precision at that scale does not help triage. */
const COMPACT_NUMBER_FROM = 10_000;

/** A tile number: exact below 10,000 (`5,678`), shortened from there (`10K`, `10.5K`, `1.2M`). */
const formatTileNumber = (value: number): string =>
  Math.abs(value) >= COMPACT_NUMBER_FROM
    ? // Kibana's locale rather than the browser's, so the suffix matches the UI language (`K`, not en-GB `k`).
      new Intl.NumberFormat(i18n.getLocale(), {
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(value)
    : value.toLocaleString();

/** Delta text formatted like the main number, e.g. `+3`, `+1,627` or `+10.5K`. */
const formatDelta = (delta: number): string => `${delta > 0 ? '+' : ''}${formatTileNumber(delta)}`;

/** What the delta row says, for a screen reader: the signed change, or that the history is too short. */
const getDeltaDescription = (
  shownDelta: number | undefined,
  showNoHistory: boolean
): string | undefined => {
  if (shownDelta === undefined) return showNoHistory ? notEnoughHistory : undefined;
  // Exact, even where the badge shortens it.
  const amount = Math.abs(shownDelta).toLocaleString();
  return shownDelta > 0
    ? i18n.translate('xpack.securitySolution.entityAnalytics.facelift.signalCard.ariaLabelUp', {
        defaultMessage: 'Up {amount} compared with the previous period',
        values: { amount },
      })
    : i18n.translate('xpack.securitySolution.entityAnalytics.facelift.signalCard.ariaLabelDown', {
        defaultMessage: 'Down {amount} compared with the previous period',
        values: { amount },
      });
};

const DeltaLabel: React.FC<{ text?: string; testSubj?: string }> = ({
  text = vsPreviousPeriod,
  testSubj = 'eaFaceliftSignalCardDeltaLabel',
}) => {
  const { euiTheme } = useEuiTheme();
  const { fontSize } = useEuiFontSize('xs');
  return (
    <span
      css={css`
        min-inline-size: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: ${fontSize};
        font-weight: ${euiTheme.font.weight.regular};
        line-height: ${METRIC_LINE_HEIGHT};
        color: ${euiTheme.colors.textSubdued};
      `}
      data-test-subj={testSubj}
    >
      {text}
    </span>
  );
};

/** Secondary metric: trend badge with the label after it. */
const MetricTrendBadge: React.FC<{ delta: number }> = ({ delta }) => {
  const { euiTheme } = useEuiTheme();
  const { fontSize } = useEuiFontSize('xs');
  const { backgroundColor, textColor, icon } = getTrendReversedBadgeColors(delta, euiTheme);

  return (
    <span
      css={css`
        display: inline-flex;
        align-items: center;
        gap: ${euiTheme.size.xs};
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
          font-size: ${fontSize};
          line-height: 1;
          font-weight: ${euiTheme.font.weight.medium};
          background-color: ${backgroundColor};
          color: ${textColor};
        `}
        data-test-subj="eaFaceliftSignalCardDeltaBadge"
      >
        <span>{formatDelta(delta)}</span>
        <span
          aria-hidden
          css={css`
            margin-inline-start: ${euiTheme.size.xs};
          `}
        >
          {icon}
        </span>
      </span>
      <DeltaLabel />
    </span>
  );
};

/**
 * The filter icon in the tile's corner. It is decorative: the tile itself is the one control that
 * turns the filter on and off, so the icon is not a second, nested button.
 */
const CornerControl: React.FC<{
  selected: boolean;
  emphasized: boolean;
}> = ({ selected, emphasized }) => {
  const { euiTheme } = useEuiTheme();

  // Match default filter chrome; selection is signaled by the accent dot only.
  const iconColor = emphasized ? 'primary' : euiTheme.colors.textSubdued;

  return (
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
          // 'original' leaves out the icon's own size class, so the size below needs no override.
          size="original"
          color="accent"
          aria-hidden
          data-test-subj="eaFaceliftSignalCardSelectedDot"
          css={css`
            position: absolute;
            inset-block-start: -${SELECTED_DOT_OFFSET}px;
            inset-inline-end: -${SELECTED_DOT_OFFSET}px;
            inline-size: ${SELECTED_DOT_SIZE}px;
            block-size: ${SELECTED_DOT_SIZE}px;
            stroke: ${euiTheme.colors.emptyShade};
            stroke-width: ${euiTheme.border.width.thin};
            paint-order: stroke;
            pointer-events: none;
          `}
        />
      ) : null}
    </span>
  );
};

/**
 * Decorative area sparkline behind the value: highlighted fill with a 1px peak line on top.
 * The series is a headcount, so it is drawn as steps over a y-axis anchored at zero. The steps are
 * centred on each point, so the first and last points (the delta's baseline and the live count)
 * keep half a step of width instead of the last one vanishing at the edge.
 */
const Sparkline: React.FC<{ values: number[]; title: string }> = ({ values, title }) => {
  const { euiTheme } = useEuiTheme();
  const chartBaseTheme = useElasticChartsTheme();
  const fill = euiTheme.colors.backgroundBaseHighlighted;
  const stroke = euiTheme.colors.borderBaseDisabled;
  const data = useMemo(() => values.map((y, x) => ({ x, y })), [values]);
  const yDomain = useMemo(() => ({ min: 0, max: Math.max(1, ...values) }), [values]);

  const ariaLabel = i18n.translate(
    'xpack.securitySolution.entityAnalytics.facelift.signalCard.trendA11yTitle',
    { defaultMessage: '{title} over the selected time range.', values: { title } }
  );
  const ariaDescription = i18n.translate(
    'xpack.securitySolution.entityAnalytics.facelift.signalCard.trendA11yDescription',
    {
      defaultMessage: 'A step chart of {title} from {first} to {last}. Peak {peak}.',
      values: {
        title,
        first: values[0],
        last: values[values.length - 1],
        peak: Math.max(0, ...values),
      },
    }
  );

  return (
    <Chart size={['100%', '100%']}>
      <Settings
        baseTheme={chartBaseTheme}
        locale={i18n.getLocale()}
        showLegend={false}
        ariaLabel={ariaLabel}
        ariaDescription={ariaDescription}
        ariaUseDefaultSummary={false}
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
        curve={CurveType.CURVE_STEP}
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

const filterTableTooltip = (title: string) =>
  i18n.translate('xpack.securitySolution.entityAnalytics.facelift.signalCard.filterTooltip', {
    defaultMessage: 'Filter table: {title}',
    values: { title },
  });

const unfilterTableTooltip = (title: string) =>
  i18n.translate('xpack.securitySolution.entityAnalytics.facelift.signalCard.unfilterTooltip', {
    defaultMessage: 'Unfilter table: {title}',
    values: { title },
  });

const renderValueRow = (card: SignalCardData, isLoading: boolean, isZero: boolean) => {
  if (isLoading) {
    return <EuiLoadingSpinner size="l" data-test-subj="eaFaceliftSignalCardLoading" />;
  }
  // A 0 without a result (failed, skipped, timed out, no access) is not a count: keep the dash.
  if (isZero && !card.hasCount) {
    return '—';
  }
  return formatTileNumber(card.value);
};

/**
 * A Needs-attention KPI tile (EUI layout + area sparkline), ported from the designer's v6
 * prototype. The whole card is the one control that toggles the filter (select and clear), with
 * hover and selected states.
 */
export const SignalCard: React.FC<SignalCardProps> = ({ card, selected, onToggle }) => {
  const { euiTheme } = useEuiTheme();
  const { fontSize: titleFontSize } = useEuiFontSize('s');
  const { fontSize: subtitleFontSize } = useEuiFontSize('xs');
  const [hovered, setHovered] = useState(false);

  const isLoading = card.isLoading ?? false;
  const isZero = card.value === 0;
  const interactive = !isZero && !isLoading;
  const noDataMessage = isZero && !isLoading ? card.noDataMessage : undefined;
  // Hover only: mouse clicks must not leave focus chrome that looks like hover after deselect.
  const emphasized = interactive && hovered;

  const tileBackground = selected
    ? euiTheme.colors.backgroundBasePrimary
    : emphasized
    ? euiTheme.colors.backgroundBaseSubdued
    : euiTheme.colors.backgroundBasePlain;
  const activeBorder = euiTheme.colors.borderStrongPrimary;
  const hoverBorder = euiTheme.colors.borderBaseProminent;
  const borderColor = selected
    ? activeBorder
    : emphasized
    ? hoverBorder
    : euiTheme.colors.borderBasePlain;

  const { delta, trend } = card;
  const shownDelta =
    interactive && !card.isDeltaLoading && delta !== undefined && delta !== 0 ? delta : undefined;
  // No line next to "Not enough history to compare": the short history would make it misleading.
  const shownTrend =
    interactive && card.isDeltaUnavailable !== true && trend !== undefined && trend.length > 1
      ? trend
      : undefined;
  const showNoHistory =
    interactive &&
    card.isDeltaUnavailable === true &&
    !card.isDeltaLoading &&
    shownDelta === undefined;

  const deltaDescription = getDeltaDescription(shownDelta, showNoHistory);
  const ariaLabel = deltaDescription ? `${card.title}. ${deltaDescription}` : card.title;

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
      aria-label={ariaLabel}
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
        /* A floor, not a fixed height: tiles in a grid row stretch to the tallest, so a long title
           grows every tile in the row together instead of being clipped. */
        min-block-size: calc(${euiTheme.size.xxxxl} * ${MIN_HEIGHT_FACTOR});
        padding: ${euiTheme.size.base};
        border: 1px solid ${borderColor};
        border-radius: ${euiTheme.border.radius.panel};
        background: ${tileBackground};
        cursor: ${interactive ? 'pointer' : 'default'};
        overflow: hidden;
        position: relative;
        z-index: ${selected || emphasized ? 2 : 1};
        transition: border-color ${euiTheme.animation.fast} ${euiTheme.animation.resistance},
          background-color ${euiTheme.animation.fast} ${euiTheme.animation.resistance};

        /* A ring on the tile's own outline: painted above its children (the sparkline), so it
           goes all the way round the tile; the raised z-index keeps a neighbour from covering it. */
        &:focus-visible {
          border-color: ${selected ? activeBorder : hoverBorder};
          outline: ${euiTheme.focus.width} solid ${euiTheme.focus.color};
          z-index: 3;
        }
      `}
    >
      {shownTrend ? (
        <div
          css={css`
            position: absolute;
            inset-inline: 0;
            inset-block-end: 0;
            block-size: ${SPARKLINE_HEIGHT_RATIO * 100}%;
            pointer-events: none;
            z-index: 0;
          `}
        >
          <Sparkline values={shownTrend} title={card.title} />
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
              title={card.title}
              css={css`
                font-size: ${titleFontSize};
                font-weight: ${euiTheme.font.weight.bold};
                line-height: ${METRIC_LINE_HEIGHT};
                ${metricLineClamp(2)}
              `}
            >
              {card.title}
            </EuiText>
            <EuiText
              color="subdued"
              title={card.description}
              css={css`
                margin-block-start: ${TITLE_SUBTITLE_GAP}px;
                font-size: ${subtitleFontSize};
                line-height: ${METRIC_LINE_HEIGHT};
                ${metricLineClamp(2)}
              `}
            >
              {card.description}
            </EuiText>
          </EuiFlexItem>
          {interactive ? (
            <EuiFlexItem grow={false}>
              <CornerControl selected={selected} emphasized={emphasized} />
            </EuiFlexItem>
          ) : null}
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
              {noDataMessage ? (
                <EuiText size="xs" color="subdued">
                  {noDataMessage}
                </EuiText>
              ) : (
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
                  {renderValueRow(card, isLoading, isZero)}
                </EuiText>
              )}
              {interactive && card.isDeltaLoading ? (
                <span>
                  <EuiLoadingSpinner size="s" /> <DeltaLabel />
                </span>
              ) : null}
              {shownDelta !== undefined ? <MetricTrendBadge delta={shownDelta} /> : null}
              {showNoHistory ? (
                <DeltaLabel
                  text={notEnoughHistory}
                  testSubj="eaFaceliftSignalCardDeltaUnavailable"
                />
              ) : null}
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
      content={selected ? unfilterTableTooltip(card.title) : filterTableTooltip(card.title)}
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
