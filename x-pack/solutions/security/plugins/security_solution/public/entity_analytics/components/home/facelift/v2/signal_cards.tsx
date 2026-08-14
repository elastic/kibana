/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Chart, Metric, Settings, type MetricDatum } from '@elastic/charts';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPanel,
  EuiPopover,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import { i18n } from '@kbn/i18n';

import type { ActiveFilter, SignalCardData, SignalCardId } from './data';

export interface SignalCardsProps {
  activeFilter: ActiveFilter | null;
  /** Card values for the current page filters — see `getSignalCards`. */
  cards: SignalCardData[];
  onFilterForCard: (cardId: SignalCardId) => void;
  onFilterOutCard: (cardId: SignalCardId) => void;
  onAddCardToTimeline: (cardId: SignalCardId) => void;
}

/**
 * Tall enough for the 42px value, title and subtitle at six columns once the
 * value sits in the bottom-right corner.
 */
const CARDS_HEIGHT = 160;
const VALUE_FONT_SIZE = 42;

const FILTER_FOR = i18n.translate(
  'xpack.securitySolution.entityAnalytics.homePage.signalCards.filterFor',
  { defaultMessage: 'Filter for' }
);
const FILTER_OUT = i18n.translate(
  'xpack.securitySolution.entityAnalytics.homePage.signalCards.filterOut',
  { defaultMessage: 'Filter out' }
);
const ADD_TO_TIMELINE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.homePage.signalCards.addToTimeline',
  { defaultMessage: 'Add to Timeline' }
);
const OPEN_ACTIONS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.homePage.signalCards.openActions',
  { defaultMessage: 'Open actions' }
);

interface SignalCardActionsIconProps {
  width: number;
  height: number;
  color: string;
  cardId: SignalCardId;
  onFilterForCard: (cardId: SignalCardId) => void;
  onFilterOutCard: (cardId: SignalCardId) => void;
  onAddCardToTimeline: (cardId: SignalCardId) => void;
}

/**
 * Metric chart top-right icon slot — three-dots menu matching Alerts Summary
 * cell actions (Filter for / Filter out / Add to Timeline).
 */
const SignalCardActionsIcon: React.FC<SignalCardActionsIconProps> = ({
  // Metric passes width/height/color for its icon slot (often 16px); ignore for hit target —
  // EuiButtonIcon size="xs" is the 24×24 control that matches EUI icon buttons elsewhere.
  cardId,
  onFilterForCard,
  onFilterOutCard,
  onAddCardToTimeline,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsOpen((open) => !open);
  }, []);

  const stopChartClick = useCallback((event: React.SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const items = useMemo(
    () => [
      <EuiContextMenuItem
        key="filterFor"
        icon="plusCircle"
        data-test-subj={`eaFaceliftSignalCardFilterFor-${cardId}`}
        onClick={() => {
          close();
          onFilterForCard(cardId);
        }}
      >
        {FILTER_FOR}
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        key="filterOut"
        icon="minusCircle"
        data-test-subj={`eaFaceliftSignalCardFilterOut-${cardId}`}
        onClick={() => {
          close();
          onFilterOutCard(cardId);
        }}
      >
        {FILTER_OUT}
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        key="addToTimeline"
        icon="timeline"
        data-test-subj={`eaFaceliftSignalCardAddToTimeline-${cardId}`}
        onClick={() => {
          close();
          onAddCardToTimeline(cardId);
        }}
      >
        {ADD_TO_TIMELINE}
      </EuiContextMenuItem>,
    ],
    [cardId, close, onAddCardToTimeline, onFilterForCard, onFilterOutCard]
  );

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={close}
      panelPaddingSize="none"
      anchorPosition="rightCenter"
      ownFocus
      button={
        <EuiButtonIcon
          iconType="boxesVertical"
          color="text"
          display="empty"
          size="xs"
          aria-label={OPEN_ACTIONS}
          data-test-subj={`eaFaceliftSignalCardActions-${cardId}`}
          onMouseDown={stopChartClick}
          onMouseUp={stopChartClick}
          onClick={toggle}
        />
      }
    >
      <EuiContextMenuPanel size="s" items={items} />
    </EuiPopover>
  );
};

/**
 * Row 1 — six equal-width signal metrics. Cards themselves are non-interactive;
 * actions live in the Metric icon slot (⋮ menu).
 */
export const SignalCards: React.FC<SignalCardsProps> = ({
  activeFilter,
  cards,
  onFilterForCard,
  onFilterOutCard,
  onAddCardToTimeline,
}) => {
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
          icon: (props: { width: number; height: number; color: string }) => (
            <SignalCardActionsIcon
              {...props}
              cardId={card.id}
              onFilterForCard={onFilterForCard}
              onFilterOutCard={onFilterOutCard}
              onAddCardToTimeline={onAddCardToTimeline}
            />
          ),
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
      onAddCardToTimeline,
      onFilterForCard,
      onFilterOutCard,
    ]
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

          /* Cards are not clickable — neutralize any residual cursor. */
          .echMetric {
            cursor: default;
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
          />
          <Metric id="eaFaceliftSignalCards" data={[row]} />
        </Chart>
      </div>
    </EuiPanel>
  );
};
