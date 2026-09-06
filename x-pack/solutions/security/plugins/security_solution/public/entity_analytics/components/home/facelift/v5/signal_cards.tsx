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

import type { ActiveFilter, SignalCardData, SignalCardId } from './data';
import { METRIC_CHARTS_BODY_HEIGHT } from './metric_charts_layout';

export interface SignalCardsProps {
  activeFilter: ActiveFilter | null;
  /** Card values for the current page filters — see `getSignalCards`. */
  cards: SignalCardData[];
  onFilterForCard: (cardId: SignalCardId) => void;
  /** Kept for MetricChartsPanel wiring; cards are whole-card toggles in v.5. */
  onFilterOutCard?: (cardId: SignalCardId) => void;
  onAddCardToTimeline?: (cardId: SignalCardId) => void;
}

/** 6 tiles in a 3-column × 2-row grid — same height as the original 6-tile layout. */
const CARDS_HEIGHT = METRIC_CHARTS_BODY_HEIGHT;
/**
 * Match Elastic Charts `Metric` defaults for a ~156px tile
 * (`theme.metric.spacing: 'small'`, height breakpoint `s`: 150–200px).
 * See `@elastic/charts` `text_measurements.js` + `.echMetricText` CSS.
 */
const VALUE_FONT_SIZE = 36;
const TITLE_FONT_SIZE = 16;
const SUBTITLE_FONT_SIZE = 14;
const BODY_FONT_SIZE = 14;
const TITLE_SUBTITLE_GAP = 5;
/** Metric `primaryAdjacentGap` for bottom value + extra is 0. */
const DELTA_VALUE_GAP = 0;
const METRIC_LINE_HEIGHT = 1.2;
const DIMMED_OPACITY = 0.7;
const SPARKLINE_HEIGHT_RATIO = 0.5;
/** Metric `panelPadding` (small spacing). */
const CARD_PADDING = 8;
/** Default sparkline fill: #2B394F at 8% opacity. */
const SPARKLINE_FILL = 'rgba(43, 57, 79, 0.08)';
/** Active-state sparkline fill: #002D80 at 12% opacity. */
const SPARKLINE_FILL_ACTIVE = 'rgba(0, 45, 128, 0.12)';

/** v.5 title overrides (tooltip uses the same string). */
const V3_CARD_TITLES: Partial<Record<SignalCardId, string>> = {
  entitiesWithAlerts: 'Entities with alerts',
  entitiesWithAnomalies: 'Entities with anomalies',
  riskMovers: 'Risk movers',
  newlyHighCritical: 'Newly high/critical',
  watchlisted: 'Watchlisted',
  newEntity: 'New entity',
};

/** v.5 subtitle / description overrides (shared mock corpus stays unchanged). */
const V5_CARD_DESCRIPTIONS: Partial<Record<SignalCardId, string>> = {
  entitiesWithAlerts: 'Entities with at least one alert in the last 24h',
  entitiesWithAnomalies: 'Entities with at least one ML anomaly in the last 24h',
  riskMovers: 'Entities whose risk score rose ≥10 points vs yesterday',
  newlyHighCritical: 'Entities that crossed into High or Critical risk since yesterday',
  watchlisted: 'Entities on a watchlist with a risk score above zero',
  newEntity: 'Entities first seen in the last 7 days with a risk score above zero',
};

const displayTitleFor = (card: SignalCardData): string =>
  V3_CARD_TITLES[card.id] ?? card.title;

const displayDescriptionFor = (card: SignalCardData): string =>
  V5_CARD_DESCRIPTIONS[card.id] ?? card.description;

const VS_YESTERDAY = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.signalCards.vsYesterday',
  { defaultMessage: 'vs yesterday' }
);

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

/**
 * Delta under the description. These six metrics count "bad things", so the
 * polarity is inverted vs typical KPIs: an increase is danger (worse), a
 * decrease is success (better).
 */
const DeltaCaption: React.FC<{ delta: number }> = ({ delta }) => {
  const { euiTheme } = useEuiTheme();
  const increased = delta > 0;
  const tone = increased ? euiTheme.colors.textDanger : euiTheme.colors.textSuccess;
  const sign = increased ? '+' : '';

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" justifyContent="flexEnd" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon type={increased ? 'sortUp' : 'sortDown'} size="s" color={tone} aria-hidden />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText
          color={tone}
          css={css`
            font-size: ${BODY_FONT_SIZE}px;
            line-height: ${METRIC_LINE_HEIGHT};
          `}
        >
          {sign}
          {delta} {VS_YESTERDAY}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

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

/** Decorative area sparkline behind the value — fill only, no stroke. */
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
  const defaultBorder = euiTheme.colors.borderBasePlain;
  const hoverBorder = euiTheme.colors.borderBaseProminent;
  const activeBorder = euiTheme.colors.borderStrongPrimary;

  // Active keeps a white tile; only the border (and sparkline tint) mark selection.
  const tileBackground = selected ? defaultBg : emphasized ? hoverBg : defaultBg;
  const borderColor = selected ? activeBorder : emphasized ? hoverBorder : defaultBorder;
  const showDelta = false;
  const showTrend = false;
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
        border-radius: 0;
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
              css={css`
                font-size: ${TITLE_FONT_SIZE}px;
                font-weight: ${euiTheme.font.weight.bold};
                line-height: ${METRIC_LINE_HEIGHT};
              `}
            >
              {displayTitle}
            </EuiText>
            <EuiText
              color="subdued"
              css={css`
                margin-block-start: ${TITLE_SUBTITLE_GAP}px;
                font-size: ${SUBTITLE_FONT_SIZE}px;
                line-height: ${METRIC_LINE_HEIGHT};
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
              {showDelta ? <DeltaCaption delta={delta!} /> : null}
              <EuiText
                css={css`
                  font-size: ${VALUE_FONT_SIZE}px;
                  font-weight: ${euiTheme.font.weight.bold};
                  line-height: ${METRIC_LINE_HEIGHT};
                  text-align: end;
                  color: ${euiTheme.colors.textParagraph};
                `}
              >
                {card.value}
              </EuiText>
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
 * Needs-attention metrics in a 2×3 grid. Each card toggles an in-page table
 * filter (no KQL pill); selection stays on the card itself.
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
        overflow: hidden;
      `}
    >
      <div
        css={css`
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          grid-template-rows: repeat(2, minmax(0, 1fr));
          block-size: 100%;
        `}
      >
        {cards.map((card, index) => {
          const selected = activeFilter?.type === 'card' && activeFilter.cardId === card.id;
          const dimmed = Boolean(anySelected && !selected);
          const col = index % 3;
          const row = Math.floor(index / 3);

          return (
            <div
              key={card.id}
              css={css`
                min-inline-size: 0;
                min-block-size: 0;
                block-size: 100%;
                /* Overlap adjacent 1px borders so dividers stay 1px and selection paints on top. */
                margin-inline-start: ${col > 0 ? '-1px' : '0'};
                margin-block-start: ${row > 0 ? '-1px' : '0'};
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
