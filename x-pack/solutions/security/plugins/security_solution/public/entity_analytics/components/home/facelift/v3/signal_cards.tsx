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
  EuiBadge,
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
  /** Kept for MetricChartsPanel wiring; cards are whole-card toggles in v.3. */
  onFilterOutCard?: (cardId: SignalCardId) => void;
  onAddCardToTimeline?: (cardId: SignalCardId) => void;
}

/**
 * Match the Summary tab body height (Entities by / Sources panels).
 * Outer panel uses the shared height (border-box) so both accordion views align.
 */
const CARDS_HEIGHT = METRIC_CHARTS_BODY_HEIGHT;
const VALUE_FONT_SIZE = 42;
/** Title matches EUI `s` +2px; subtitle is +1px vs `xs`; delta / captions +2px. */
const TITLE_FONT_SIZE = 17;
const SUBTITLE_FONT_SIZE = 14;
const BODY_FONT_SIZE = 14;
const TITLE_SUBTITLE_GAP = 8;
const SUBTITLE_STATUS_GAP = 8;
const DELTA_VALUE_GAP = 4;
const DIMMED_OPACITY = 0.7;
const SPARKLINE_HEIGHT_RATIO = 0.5;
const CARD_PADDING = 8;
/** Default sparkline fill: #2B394F at 8% opacity. */
const SPARKLINE_FILL = 'rgba(43, 57, 79, 0.08)';
/** Active-state sparkline fill: #002D80 at 12% opacity. */
const SPARKLINE_FILL_ACTIVE = 'rgba(0, 45, 128, 0.12)';

/**
 * v.3-only mock trends / deltas (kept out of shared `v2/data` so v.2 charts
 * stay unchanged).
 */
const V3_CARD_TRENDS: Record<SignalCardId, number[]> = {
  untriagedHighRisk: [6, 7, 7, 8, 8, 9, 10],
  newToCritical: [2, 3, 3, 4, 5, 5, 6],
  riskMovers: [6, 8, 7, 9, 11, 10, 14],
  newAndAlerting: [1, 2, 2, 3, 3, 4, 4],
  newAnomalies: [52, 48, 45, 41, 44, 39, 37],
  hiddenRisk: [18, 16, 15, 14, 13, 13, 12],
};

const V3_CARD_DELTAS: Partial<Record<SignalCardId, number>> = {
  untriagedHighRisk: 3,
  newToCritical: 2,
  riskMovers: 4,
  newAndAlerting: 1,
  newAnomalies: -5,
  hiddenRisk: -2,
};

/** v.3 title overrides (tooltip uses the same string). */
const V3_CARD_TITLES: Partial<Record<SignalCardId, string>> = {
  newToCritical: 'New to critical',
};

const displayTitleFor = (card: SignalCardData): string =>
  V3_CARD_TITLES[card.id] ?? card.title;

const FILTERING_TABLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.signalCards.filteringTable',
  { defaultMessage: 'Filtering table' }
);
const ALL_CLEAR = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.signalCards.allClear',
  { defaultMessage: 'All clear' }
);
const VS_YESTERDAY = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.signalCards.vsYesterday',
  { defaultMessage: 'vs yesterday' }
);

const filterTableTooltip = (title: string) =>
  i18n.translate('xpack.securitySolution.entityAnalytics.facelift.signalCards.filterTableTooltip', {
    defaultMessage: 'Filter table: {title}',
    values: { title },
  });

/**
 * Delta under the description. These six metrics count “bad things”, so the
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
            line-height: 1.2;
          `}
        >
          {sign}
          {delta} {VS_YESTERDAY}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const StatusCaption: React.FC<{
  iconType: 'filterInclude' | 'checkInCircleFilled';
  label: string;
  color: string;
}> = ({ iconType, label, color }) => (
  <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiIcon type={iconType} size="s" color={color} aria-hidden />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiText
        color={color}
        css={css`
          font-size: ${BODY_FONT_SIZE}px;
          line-height: 1.2;
        `}
      >
        {label}
      </EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
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

  const iconColor = selected || emphasized ? 'primary' : euiTheme.colors.textSubdued;

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
          color: ${euiTheme.colors.textPrimary};
        `}
      >
        <EuiIcon type="cross" size="m" color="primary" aria-hidden />
      </button>
    );
  }

  return <EuiIcon type="filter" size="m" color={iconColor} aria-hidden />;
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
  const sparklineFill = selected ? SPARKLINE_FILL_ACTIVE : SPARKLINE_FILL;

  const delta = V3_CARD_DELTAS[card.id] ?? card.delta;
  const showDelta = interactive && !isZero && delta !== undefined && delta !== 0;
  const trendKeyframes = V3_CARD_TRENDS[card.id] ?? card.trend;
  const showTrend = interactive && Boolean(trendKeyframes && trendKeyframes.length > 1);
  const displayTitle = displayTitleFor(card);

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
                line-height: 1.25;
              `}
            >
              {displayTitle}
            </EuiText>
            <EuiText
              color="subdued"
              css={css`
                margin-block-start: ${TITLE_SUBTITLE_GAP}px;
                font-size: ${SUBTITLE_FONT_SIZE}px;
                line-height: 1.3;
              `}
            >
              {card.description}
            </EuiText>
            {selected ? (
              <div
                css={css`
                  margin-block-start: ${SUBTITLE_STATUS_GAP}px;
                `}
              >
                <EuiBadge
                  color="primary"
                  iconType="filterInclude"
                  css={css`
                    font-size: ${BODY_FONT_SIZE}px;
                  `}
                >
                  {FILTERING_TABLE}
                </EuiBadge>
              </div>
            ) : null}
            {isZero ? (
              <div
                css={css`
                  margin-block-start: ${SUBTITLE_STATUS_GAP}px;
                `}
              >
                <StatusCaption
                  iconType="checkInCircleFilled"
                  label={ALL_CLEAR}
                  color={euiTheme.colors.textSuccess}
                />
              </div>
            ) : null}
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
                  line-height: 1;
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
      content={filterTableTooltip(displayTitle)}
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
 * Row of six Needs-attention metrics. Each card toggles an in-page table
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
      hasBorder
      paddingSize="none"
      data-test-subj="eaFaceliftSignalCards"
      css={css`
        block-size: ${CARDS_HEIGHT}px;
        overflow: hidden;
      `}
    >
      <EuiFlexGroup
        gutterSize="none"
        responsive={false}
        alignItems="stretch"
        css={css`
          block-size: 100%;
        `}
      >
        {cards.map((card, index) => {
          const selected = activeFilter?.type === 'card' && activeFilter.cardId === card.id;
          const dimmed = Boolean(anySelected && !selected);

          return (
            <EuiFlexItem
              key={card.id}
              grow={1}
              css={css`
                min-inline-size: 0;
                /* Overlap adjacent 1px borders so dividers stay 1px and selection paints on top. */
                margin-inline-start: ${index > 0 ? '-1px' : '0'};
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
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
