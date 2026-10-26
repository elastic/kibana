/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import type { SignalCardData, SignalCardId } from './data';
import { SignalCard } from './signal_card';
import { SIGNAL_CARDS_TOUR_ANCHOR_TEST_ID } from '../product_tour/constants';

// Zero-size product tour anchor at the middle of the first card's right edge. The tour
// popover moves the anchor into its own wrapper, so it must be out of flow.
const tourAnchorCss = css`
  position: absolute;
  inset-block-start: 50%;
  inset-inline-end: 0;
  inline-size: 0;
  block-size: 0;
  line-height: 0;
  pointer-events: none;
`;

export interface SignalCardsProps {
  activeTile: SignalCardId | null;
  /** Card values for the current page filters — see `getSignalCards`. */
  cards: SignalCardData[];
  onFilterForCard: (cardId: SignalCardId) => void;
  /** Kept for MetricChartsPanel wiring; cards are whole-card toggles in v.5. */
  onFilterOutCard?: (cardId: SignalCardId) => void;
  onAddCardToTimeline?: (cardId: SignalCardId) => void;
}

/** Named container so the grid can step columns from its own width, not the viewport. */
const SIGNAL_CARDS_CONTAINER = 'eaSignalCards';
/** 6-across, then 3 / 2 / 1 so the last row stays even. */
const CARD_MIN_WIDTH = '12rem';
const COLUMN_STEPS = [6, 3, 2, 1] as const;

const spaceForColumns = (count: number, minItemWidth: string, gap: string): string =>
  count === 1 ? minItemWidth : `calc(${count} * ${minItemWidth} + ${count - 1} * ${gap})`;

/**
 * Caps column count (6 across) and steps down via container queries
 * when tiles would otherwise shrink below `minItemWidth`.
 */
const layoutCappedGridCss = ({
  minItemWidth,
  columnSteps,
  gap,
}: {
  minItemWidth: string;
  columnSteps: readonly number[];
  gap: string;
}) => {
  const [maxColumns, ...narrower] = columnSteps;
  const steps = narrower
    .map((columns, index) => {
      const threshold = spaceForColumns(columnSteps[index], minItemWidth, gap);
      return `
        @container ${SIGNAL_CARDS_CONTAINER} (width < ${threshold}) {
          grid-template-columns: repeat(${columns}, minmax(0, 1fr));
        }
      `;
    })
    .join('');

  return css`
    display: grid;
    gap: ${gap};
    grid-template-columns: repeat(${maxColumns}, minmax(0, 1fr));
    ${steps}
  `;
};

/**
 * Needs-attention metrics in a capped wrapping grid (6 across, stepping down to 3 / 2 / 1).
 * Each card toggles an in-page table filter; selection stays on the card itself.
 */
export const SignalCards: React.FC<SignalCardsProps> = ({ activeTile, cards, onFilterForCard }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel
      hasBorder={false}
      hasShadow={false}
      paddingSize="none"
      data-test-subj="eaFaceliftSignalCards"
      css={css`
        container-type: inline-size;
        container-name: ${SIGNAL_CARDS_CONTAINER};
      `}
    >
      <div
        css={layoutCappedGridCss({
          minItemWidth: CARD_MIN_WIDTH,
          columnSteps: COLUMN_STEPS,
          gap: euiTheme.size.s,
        })}
      >
        {cards.map((card, index) => {
          const selected = activeTile === card.id;

          return (
            <div
              key={card.id}
              css={css`
                min-inline-size: 0;
                position: relative;
                z-index: ${selected ? 2 : 1};

                &:hover,
                &:focus-within {
                  z-index: 2;
                }
              `}
            >
              <SignalCard
                card={card}
                selected={selected}
                onToggle={() => onFilterForCard(card.id)}
              />
              {index === 0 && (
                <div aria-hidden="true" css={tourAnchorCss}>
                  <span data-test-subj={SIGNAL_CARDS_TOUR_ANCHOR_TEST_ID} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </EuiPanel>
  );
};
