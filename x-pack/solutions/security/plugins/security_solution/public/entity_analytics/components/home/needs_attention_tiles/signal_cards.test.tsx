/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { SignalCardData, SignalCardId } from './data';
import { SignalCards } from './signal_cards';

const mockMetricData: Array<Record<string, unknown>> = [];
let mockOnElementClick: Array<(() => void) | undefined> = [];

jest.mock('@kbn/charts-theme', () => ({ useElasticChartsTheme: () => ({}) }));
jest.mock('@elastic/charts', () => ({
  Chart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Settings: ({ onElementClick }: { onElementClick?: () => void }) => {
    mockOnElementClick.push(onElementClick);
    return null;
  },
  Metric: ({ data }: { data: Array<Array<Record<string, unknown>>> }) => {
    mockMetricData.push(data[0][0]);
    return null;
  },
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
}));

describe('SignalCards', () => {
  beforeEach(() => {
    mockMetricData.length = 0;
    mockOnElementClick = [];
  });

  it('draws every tile with the Metric chart, with the same fields', () => {
    render(<SignalCards activeFilter={null} cards={cards} onFilterForCard={jest.fn()} />);

    CARD_IDS.forEach((id) => {
      expect(screen.getByTestId(`eaFaceliftSignalCard-${id}`)).toBeInTheDocument();
    });
    expect(mockMetricData.map(({ title }) => title)).toEqual(cards.map(({ title }) => title));
    expect(mockMetricData.map(({ subtitle }) => subtitle)).toEqual(
      cards.map(({ description }) => description)
    );
    expect(mockMetricData.map(({ value }) => value)).toEqual(cards.map(({ value }) => value));
  });

  it('toggles the table filter for the tile that was clicked', () => {
    const onFilterForCard = jest.fn();
    render(<SignalCards activeFilter={null} cards={cards} onFilterForCard={onFilterForCard} />);

    mockOnElementClick[2]?.();

    expect(onFilterForCard).toHaveBeenCalledTimes(1);
    expect(onFilterForCard).toHaveBeenCalledWith('riskMovers');
  });

  it('does not make a tile with a count of 0 clickable', () => {
    render(
      <SignalCards
        activeFilter={null}
        cards={cards.map((card) =>
          card.id === 'newlyHighCritical' ? { ...card, value: 0 } : card
        )}
        onFilterForCard={jest.fn()}
      />
    );

    expect(mockOnElementClick[3]).toBeUndefined();
    expect(mockOnElementClick[0]).toBeDefined();
  });
});
