/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { SignalCardData, SignalCardId } from './data';
import { SignalCards } from './signal_cards';

jest.mock('@kbn/charts-theme', () => ({ useElasticChartsTheme: () => ({}) }));
jest.mock('@elastic/charts', () => ({
  Chart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Settings: () => null,
  Axis: () => null,
  AreaSeries: () => null,
  Position: { Left: 'left' },
  ScaleType: { Linear: 'linear' },
  CurveType: { CURVE_STEP_AFTER: 'curveStepAfter' },
}));

const CARD_IDS: SignalCardId[] = [
  'entitiesWithAlerts',
  'entitiesWithAnomalies',
  'riskMovers',
  'newlyHighCritical',
  'watchlisted',
  'newEntity',
];

const cards: SignalCardData[] = CARD_IDS.map((id, index) => ({
  id,
  title: `Title ${id}`,
  description: `Description ${id}`,
  filterLabel: id,
  value: index + 1,
  delta: 2,
  trend: [1, 2, 3],
}));

describe('SignalCards', () => {
  it('draws every tile with its title, description and count', () => {
    render(<SignalCards activeTile={null} cards={cards} onFilterForCard={jest.fn()} />);

    cards.forEach(({ id, title, description, value }) => {
      const tile = screen.getByTestId(`eaFaceliftSignalCard-${id}`);
      expect(tile).toHaveTextContent(title);
      expect(tile).toHaveTextContent(description);
      expect(tile).toHaveTextContent(String(value));
    });
  });

  it('toggles the table filter for the tile that was clicked', () => {
    const onFilterForCard = jest.fn();
    render(<SignalCards activeTile={null} cards={cards} onFilterForCard={onFilterForCard} />);

    fireEvent.click(screen.getByTestId('eaFaceliftSignalCard-riskMovers'));

    expect(onFilterForCard).toHaveBeenCalledTimes(1);
    expect(onFilterForCard).toHaveBeenCalledWith('riskMovers');
  });

  it('marks only the filtered tile as pressed', () => {
    render(<SignalCards activeTile="watchlisted" cards={cards} onFilterForCard={jest.fn()} />);

    expect(screen.getByTestId('eaFaceliftSignalCard-watchlisted')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByTestId('eaFaceliftSignalCard-riskMovers')).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('does not make a tile with a count of 0 clickable', () => {
    const onFilterForCard = jest.fn();
    render(
      <SignalCards
        activeTile={null}
        cards={cards.map((card) =>
          card.id === 'newlyHighCritical' ? { ...card, value: 0 } : card
        )}
        onFilterForCard={onFilterForCard}
      />
    );

    fireEvent.click(screen.getByTestId('eaFaceliftSignalCard-newlyHighCritical'));

    expect(onFilterForCard).not.toHaveBeenCalled();
  });
});
