/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Chart, Metric, Settings, type MetricDatum } from '@elastic/charts';
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
const DIMMED_OPACITY = 0.7;

/**
 * v.3-only mock trends / deltas (kept out of shared `v2/data` so v.2 charts
 * stay unchanged).
 */
const V3_CARD_TRENDS: Record<SignalCardId, number[]> = {
  untriagedHighRisk: [14, 16, 15, 18, 19, 21, 23],
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

const filterTableTooltip = (label: string) =>
  i18n.translate('xpack.securitySolution.entityAnalytics.facelift.signalCards.filterTableTooltip', {
    defaultMessage: 'Filter table: {label}',
    values: { label },
  });

/**
 * Delta under the description. These six metrics count “bad things”, so the
 * polarity is inverted vs typical KPIs: an increase is danger (worse), a
 * decrease is success (better).
 */
const DeltaExtra: React.FC<{ delta: number; fontSize: number; color: string }> = ({
  delta,
  fontSize,
}) => {
  const { euiTheme } = useEuiTheme();
  const increased = delta > 0;
  const tone = increased ? euiTheme.colors.textDanger : euiTheme.colors.textSuccess;
  const sign = increased ? '+' : '';

  return (
    <EuiFlexGroup
      gutterSize="xs"
      alignItems="center"
      responsive={false}
      css={css`
        color: ${tone};
        font-size: ${fontSize}px;
        line-height: 1.2;
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiIcon type={increased ? 'sortUp' : 'sortDown'} size="s" color={tone} aria-hidden />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <span>
          {sign}
          {delta} {VS_YESTERDAY}
        </span>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const StatusCaption: React.FC<{
  iconType: 'check' | 'checkInCircleFilled';
  label: string;
  color: string;
}> = ({ iconType, label, color }) => (
  <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiIcon type={iconType} size="s" color={color} aria-hidden />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiText size="xs" color={color}>
        {label}
      </EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
);

const CornerIcon: React.FC<{
  width: number;
  height: number;
  color: string;
  selected: boolean;
  interactive: boolean;
  hovered: boolean;
  onClear?: () => void;
}> = ({ width, height, selected, interactive, hovered, onClear }) => {
  const { euiTheme } = useEuiTheme();

  if (!interactive) {
    return null;
  }

  const iconColor = selected || hovered ? 'primary' : euiTheme.colors.textSubdued;

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
          inline-size: ${width}px;
          block-size: ${height}px;
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

  return (
    <span
      css={css`
        display: inline-flex;
        align-items: center;
        justify-content: center;
        inline-size: ${width}px;
        block-size: ${height}px;
      `}
    >
      <EuiIcon type="filter" size="m" color={iconColor} aria-hidden />
    </span>
  );
};

interface SignalMetricCardProps {
  card: SignalCardData;
  selected: boolean;
  dimmed: boolean;
  onToggle: () => void;
}

/**
 * One Needs-attention metric: Elastic Charts Metric inside an interactive
 * EUI wrapper (border / tooltip / keyboard) for states Metric cannot express.
 */
const SignalMetricCard: React.FC<SignalMetricCardProps> = ({
  card,
  selected,
  dimmed,
  onToggle,
}) => {
  const { euiTheme } = useEuiTheme();
  const chartBaseTheme = useElasticChartsTheme();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  const isZero = card.value === 0;
  const interactive = !isZero;
  const emphasized = interactive && (hovered || focused);

  // Default / hover / active surfaces — EUI semantic tokens.
  const defaultBg = euiTheme.colors.backgroundBasePlain;
  const hoverBg = euiTheme.colors.backgroundBaseSubdued;
  const activeBg = euiTheme.colors.backgroundLightPrimary;
  const defaultBorder = euiTheme.colors.borderBasePlain;
  const hoverBorder = euiTheme.colors.borderBaseProminent;
  const activeBorder = euiTheme.colors.borderStrongPrimary;

  const tileBackground = selected ? activeBg : emphasized ? hoverBg : defaultBg;
  const borderColor = selected ? activeBorder : emphasized ? hoverBorder : defaultBorder;

  const showTrend = interactive && !selected;
  const delta = V3_CARD_DELTAS[card.id] ?? card.delta;
  const showDelta = interactive && !isZero && delta !== undefined && delta !== 0;
  const trendKeyframes = V3_CARD_TRENDS[card.id] ?? card.trend;

  const datum = useMemo<MetricDatum>(() => {
    const base = {
      title: card.title,
      subtitle: card.description,
      value: card.value,
      valueFormatter: (value: number) => String(value),
      /*
       * Metric derives the trend sparkline from `color` via a native lightness
       * shift (semi-transparent overlay on the tile). Keep `color` on the tile
       * surface — do not substitute a solid muted fill.
       */
      color: tileBackground,
      background: tileBackground,
      icon: (props: { width: number; height: number; color: string }) => (
        <CornerIcon
          {...props}
          selected={selected}
          interactive={interactive}
          hovered={emphasized}
          onClear={selected ? onToggle : undefined}
        />
      ),
      ...(showDelta
        ? {
            extra: (props: { fontSize: number; color: string }) => (
              <DeltaExtra delta={delta!} {...props} />
            ),
          }
        : {}),
      // Captions are overlaid on the wrapper — Metric may hide `body` when short.
    };

    if (showTrend && trendKeyframes && trendKeyframes.length > 1) {
      return {
        ...base,
        trend: trendKeyframes.map((y, x) => ({ x, y })),
        trendShape: 'area' as const,
      };
    }

    return base;
  }, [
    card.description,
    card.title,
    card.value,
    delta,
    emphasized,
    interactive,
    onToggle,
    selected,
    showDelta,
    showTrend,
    tileBackground,
    trendKeyframes,
  ]);

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
      aria-label={card.filterLabel}
      data-test-subj={`eaFaceliftSignalCard-${card.id}`}
      onClick={interactive ? onToggle : undefined}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      css={css`
        block-size: 100%;
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

        .echMetric {
          cursor: inherit !important;
          border-color: transparent !important;
        }

        .echMetricText__value {
          font-weight: ${euiTheme.font.weight.bold};
        }
      `}
    >
      <Chart size={['100%', '100%']}>
        <Settings
          baseTheme={chartBaseTheme}
          locale={i18n.getLocale()}
          theme={{
            metric: {
              titleWeight: 'bold',
              valueFontSize: VALUE_FONT_SIZE,
              valueTextAlign: 'right',
              valuePosition: 'bottom',
              iconAlign: 'right',
              border: 'transparent',
              emptyBackground: tileBackground,
            },
            background: { color: tileBackground, fallbackColor: tileBackground },
          }}
        />
        <Metric id={`eaFaceliftSignalCard-${card.id}`} data={[[datum]]} />
      </Chart>
      {selected ? (
        <div
          css={css`
            position: absolute;
            inset-inline-start: ${euiTheme.size.m};
            inset-block-end: ${euiTheme.size.m};
            pointer-events: none;
          `}
        >
          <StatusCaption
            iconType="check"
            label={FILTERING_TABLE}
            color={euiTheme.colors.textPrimary}
          />
        </div>
      ) : null}
      {isZero ? (
        <div
          css={css`
            position: absolute;
            inset-inline-start: ${euiTheme.size.m};
            inset-block-end: ${euiTheme.size.m};
            pointer-events: none;
          `}
        >
          <StatusCaption
            iconType="checkInCircleFilled"
            label={ALL_CLEAR}
            color={euiTheme.colors.textSuccess}
          />
        </div>
      ) : null}
    </div>
  );

  if (!interactive) {
    return cardNode;
  }

  return (
    <EuiToolTip
      content={filterTableTooltip(card.filterLabel)}
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
 * Row of six Needs-attention metrics. Each card toggles the Overview KQL
 * filter; selection stays in sync with the filter badge.
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
