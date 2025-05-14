/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ResponsiveDataCards } from './responsive_data_cards';

const cards = [
  { title: 'Card 1', description: 'Description 1' },
  { title: 'Card 2', description: 'Description 2' },
  { title: 'Card 3', description: 'Description 3' },
  { title: 'Card 4', description: 'Description 4' },
];

describe('ResponsiveDataCards', () => {
  it('renders the correct number of cards', () => {
    render(<ResponsiveDataCards cards={cards} />);
    const renderedCards = screen.getAllByTestId('responsive-data-card');
    expect(renderedCards).toHaveLength(cards.length);
  });

  it('renders card titles and descriptions correctly', () => {
    render(<ResponsiveDataCards cards={cards} />);
    cards.forEach(({ title, description }) => {
      expect(screen.getByText(title)).toBeInTheDocument();
      expect(screen.getByText(description)).toBeInTheDocument();
    });
  });
});
