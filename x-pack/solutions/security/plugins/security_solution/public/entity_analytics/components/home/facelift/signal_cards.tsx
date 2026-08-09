/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { Chart, Metric, Settings, type MetricDatum } from '@elastic/charts';
import {
  EuiFlexGrid,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import { i18n } from '@kbn/i18n';

import type { ActiveFilter, SignalCardData, SignalCardId } from './data';
import { SIGNAL_CARDS } from './data';

export interface SignalCardsProps {
  activeFilter: ActiveFilter | null;
  onSelectCard: (cardId: SignalCardId) => void;
}

/** Cards that do not participate in table filtering (display-only for now). */
const NON_FILTERABLE_CARD_IDS = new Set<SignalCardId>(['unresolvedHighRisk']);

const DeltaExtra: React.FC<{ delta: number }> = ({ delta }) => {
  if (delta === 0) {
    return <EuiTextColor color="subdued">—</EuiTextColor>;
  }
  // Positive delta = worse for these risk signals (red ↑); negative = better (green ↓).
  if (delta > 0) {
    return <EuiTextColor color="danger">{`▲ ${delta}`}</EuiTextColor>;
  }
  return <EuiTextColor color="success">{`▼ ${Math.abs(delta)}`}</EuiTextColor>;
};

const SignalMetricCard: React.FC<{
  card: SignalCardData;
  selected: boolean;
  onSelect: () => void;
}> = ({ card, selected, onSelect }) => {
  const { euiTheme } = useEuiTheme();
  const chartTheme = useElasticChartsTheme();
  const filterable = !NON_FILTERABLE_CARD_IDS.has(card.id);

  const datum = useMemo<MetricDatum>(
    () => ({
      title: card.title,
      subtitle: card.label,
      value: card.value,
      valueFormatter: (v) => String(v),
      color: selected ? euiTheme.colors.backgroundBasePrimary : euiTheme.colors.backgroundBasePlain,
      extra: <DeltaExtra delta={card.delta} />,
      ...(card.trend
        ? {
            trend: card.trend.map((y, x) => ({ x, y })),
            trendShape: 'area' as const,
          }
        : {}),
    }),
    [card, euiTheme.colors.backgroundBasePlain, euiTheme.colors.backgroundBasePrimary, selected]
  );

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="none"
      onClick={filterable ? onSelect : undefined}
      aria-pressed={filterable ? selected : undefined}
      data-test-subj={`eaFaceliftSignalCard-${card.id}`}
      css={css`
        height: 100%;
        overflow: hidden;
        cursor: ${filterable ? 'pointer' : 'default'};
        border-color: ${selected ? euiTheme.colors.primary : euiTheme.colors.borderBasePlain};
        outline: ${selected ? `1px solid ${euiTheme.colors.primary}` : 'none'};
      `}
    >
      <div
        css={css`
          height: 128px;
        `}
      >
        <Chart size={['100%', '100%']}>
          <Settings
            baseTheme={chartTheme}
            locale={i18n.getLocale()}
            theme={{ metric: { valueTextAlign: 'left' } }}
          />
          <Metric id={`facelift-signal-${card.id}`} data={[[datum]]} />
        </Chart>
      </div>
      {card.secondaryLinkText && (
        <div
          css={css`
            padding: 0 ${euiTheme.size.s} ${euiTheme.size.s};
          `}
        >
          <EuiText size="xs">
            <EuiLink
              href="#"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
            >
              {card.secondaryLinkText}
            </EuiLink>
          </EuiText>
        </div>
      )}
    </EuiPanel>
  );
};

/**
 * Right Overview panel — “Where to start” 2×3 metric cards (@elastic/charts Metric).
 */
export const SignalCards: React.FC<SignalCardsProps> = ({ activeFilter, onSelectCard }) => (
  <EuiPanel hasBorder paddingSize="m" data-test-subj="eaFaceliftSignalCards">
    <EuiTitle size="xs">
      <h3>Where to start</h3>
    </EuiTitle>
    <EuiSpacer size="m" />
    <EuiFlexGrid columns={3} gutterSize="s">
      {SIGNAL_CARDS.map((card) => (
        <EuiFlexItem key={card.id}>
          <SignalMetricCard
            card={card}
            selected={activeFilter?.type === 'card' && activeFilter.cardId === card.id}
            onSelect={() => onSelectCard(card.id)}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGrid>
  </EuiPanel>
);

export { NON_FILTERABLE_CARD_IDS };
