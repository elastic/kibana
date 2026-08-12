/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  Chart,
  Metric,
  Settings,
  isMetricElementEvent,
  type ElementClickListener,
  type MetricDatum,
} from '@elastic/charts';
import { EuiIcon, EuiPanel, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import { i18n } from '@kbn/i18n';

import type { ActiveFilter, SignalCardData, SignalCardId } from './data';

export interface SignalCardsProps {
  activeFilter: ActiveFilter | null;
  /** Card values for the current page filters — see `getSignalCards`. */
  cards: SignalCardData[];
  onSelectCard: (cardId: SignalCardId) => void;
}

/**
 * Tall enough for the 42px value, title and subtitle at six columns once the
 * value sits in the bottom-right corner.
 */
const CARDS_HEIGHT = 160;
const VALUE_FONT_SIZE = 42;

const ANOMALY_EXPLORER_LINK_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.homePage.signalCards.openInAnomalyExplorer',
  { defaultMessage: 'Open in Anomaly explorer' }
);

/**
 * Metric chart's top-right icon slot. Blue and interactive like a link; click
 * is a no-op for the prototype (and must not toggle the card filter).
 */
const AnomalyExplorerIcon: React.FC<{
  width: number;
  height: number;
  color: string;
}> = ({ width, height }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiToolTip content={ANOMALY_EXPLORER_LINK_LABEL}>
      <button
        type="button"
        aria-label={ANOMALY_EXPLORER_LINK_LABEL}
        data-test-subj="eaFaceliftAnomalyExplorerLink"
        onMouseDown={(event) => event.stopPropagation()}
        onMouseUp={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        css={css`
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: ${width}px;
          height: ${height}px;
          padding: 0;
          border: 0;
          background: transparent;
          cursor: pointer;
          color: ${euiTheme.colors.textPrimary};

          &:hover,
          &:focus-visible {
            color: ${euiTheme.colors.textPrimary};
          }
        `}
      >
        <EuiIcon type="popout" size="m" color="primary" aria-hidden={true} />
      </button>
    </EuiToolTip>
  );
};

/**
 * Row 1 — six equal-width, clickable signal metrics rendered as a single
 * horizontal Metric grid (`data={[[col1, …, col6]]}`). Clicking a tile toggles
 * the Overview filter; the active tile gets a primary background.
 */
export const SignalCards: React.FC<SignalCardsProps> = ({ activeFilter, cards, onSelectCard }) => {
  const { euiTheme } = useEuiTheme();
  const chartBaseTheme = useElasticChartsTheme();

  const row = useMemo<MetricDatum[]>(
    () =>
      cards.map((card) => {
        const selected = activeFilter?.type === 'card' && activeFilter.cardId === card.id;

        return {
          title: card.title,
          subtitle: card.description,
          value: card.value,
          valueFormatter: (value: number) => String(value),
          color: selected
            ? euiTheme.colors.backgroundBasePrimary
            : euiTheme.colors.backgroundBasePlain,
          ...(card.id === 'newAnomalies' ? { icon: AnomalyExplorerIcon } : {}),
          ...(card.trend
            ? { trend: card.trend.map((y, x) => ({ x, y })), trendShape: 'area' as const }
            : {}),
        };
      }),
    [
      activeFilter,
      cards,
      euiTheme.colors.backgroundBasePlain,
      euiTheme.colors.backgroundBasePrimary,
    ]
  );

  const onElementClick = useCallback<ElementClickListener>(
    (elements) => {
      const [element] = elements;
      if (!isMetricElementEvent(element)) {
        return;
      }

      const card = cards[element.columnIndex];
      if (card) {
        onSelectCard(card.id);
      }
    },
    [cards, onSelectCard]
  );

  return (
    <EuiPanel hasBorder paddingSize="none" data-test-subj="eaFaceliftSignalCards">
      <div
        css={css`
          height: ${CARDS_HEIGHT}px;

          /* Metric theme exposes titleWeight but not value weight — match the 700 title. */
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
              },
            }}
            onElementClick={onElementClick}
          />
          <Metric id="eaFaceliftSignalCards" data={[row]} />
        </Chart>
      </div>
    </EuiPanel>
  );
};
