/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { SignalCardData } from './data';
import { SignalCards } from './signal_cards';

const card = (overrides: Partial<SignalCardData> = {}): SignalCardData => ({
  id: 'entitiesWithAlerts',
  title: 'Entities with alerts',
  description: 'Entities with a high or critical alert',
  filterLabel: 'Entities with alerts',
  value: 50,
  ...overrides,
});

const renderCards = (cards: SignalCardData[]) =>
  render(<SignalCards activeFilter={null} cards={cards} onFilterForCard={jest.fn()} />);

describe('SignalCards delta pill', () => {
  it('shows an increase with a plus sign and an up arrow, without a percentage', () => {
    renderCards([card({ value: 50, delta: 10 })]);
    expect(screen.getByText(/\+10 ↑/)).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    expect(screen.getByText('vs previous period')).toBeInTheDocument();
  });

  it('shows a decrease with a down arrow', () => {
    renderCards([card({ value: 30, delta: -10 })]);
    expect(screen.getByText(/-10 ↓/)).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it('shows the change as a plain number when the previous count was 0', () => {
    renderCards([card({ value: 12, delta: 12 })]);
    expect(screen.getByText(/\+12 ↑/)).toBeInTheDocument();
  });

  it('shows no pill for a zero or missing delta', () => {
    renderCards([card({ delta: 0 }), card({ id: 'watchlisted', title: 'Watchlisted' })]);
    expect(screen.queryByText('vs previous period')).not.toBeInTheDocument();
  });

  it('shows a spinner with the label while the delta loads', () => {
    renderCards([card({ isDeltaLoading: true })]);
    expect(screen.getByText('vs previous period')).toBeInTheDocument();
  });

  it('shows no pill when the count is 0', () => {
    renderCards([card({ value: 0, delta: 5 })]);
    expect(screen.queryByText('vs previous period')).not.toBeInTheDocument();
  });
});
