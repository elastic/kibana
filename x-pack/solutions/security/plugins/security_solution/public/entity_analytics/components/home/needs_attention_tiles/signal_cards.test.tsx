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
  render(<SignalCards activeTile={null} cards={cards} onFilterForTile={jest.fn()} />);

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

  it('formats large changes with a thousands separator, like the main number', () => {
    renderCards([card({ value: 5000, delta: 1627 }), card({ id: 'watchlisted', delta: -2270 })]);
    expect(screen.getByText(/\+1,627 ↑/)).toBeInTheDocument();
    expect(screen.getByText(/-2,270 ↓/)).toBeInTheDocument();
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

describe('SignalCards when the history is too short', () => {
  it('says there is not enough history to compare, in place of the delta', () => {
    renderCards([card({ isDeltaUnavailable: true })]);
    expect(screen.getByText('Not enough history to compare')).toBeInTheDocument();
    expect(screen.queryByText('vs previous period')).not.toBeInTheDocument();
  });

  it('does not say it at a zero count, while the delta loads, or next to a delta', () => {
    const zero = renderCards([card({ value: 0, isDeltaUnavailable: true })]);
    expect(screen.queryByText('Not enough history to compare')).not.toBeInTheDocument();
    zero.unmount();

    const loading = renderCards([card({ isDeltaLoading: true, isDeltaUnavailable: true })]);
    expect(screen.queryByText('Not enough history to compare')).not.toBeInTheDocument();
    loading.unmount();

    renderCards([card({ delta: 5, isDeltaUnavailable: true })]);
    expect(screen.queryByText('Not enough history to compare')).not.toBeInTheDocument();
    expect(screen.getByText(/\+5 ↑/)).toBeInTheDocument();
  });
});

describe('the accessible name of a card', () => {
  // The cards, not the layout toggle that also has the button role.
  const nameOf = () =>
    Array.from(document.querySelectorAll('[data-test-subj^="eaFaceliftSignalCard-"]')).map((el) =>
      el.getAttribute('aria-label')
    );

  it('says the change and the period, so a screen reader announces the delta', () => {
    renderCards([card({ value: 50, delta: 1627 })]);
    expect(nameOf()[0]).toBe(
      'Entities with alerts: 50. Entities with a high or critical alert Up 1,627 compared with the previous period'
    );
  });

  it('says a decrease as down, with its size', () => {
    renderCards([card({ value: 50, delta: -12 })]);
    expect(nameOf()[0]).toContain('Down 12 compared with the previous period');
  });

  it('says when there is not enough history to compare', () => {
    renderCards([card({ isDeltaUnavailable: true })]);
    expect(nameOf()[0]).toContain('Not enough history to compare');
  });

  it('says nothing about a change when there is none, it is loading or the count is 0', () => {
    renderCards([
      card({ delta: 0 }),
      card({ id: 'watchlisted', isDeltaLoading: true }),
      card({ id: 'newEntity', value: 0, delta: 9 }),
      card({ id: 'riskMovers' }),
    ]);
    nameOf().forEach((name) => {
      expect(name).not.toContain('compared with the previous period');
      expect(name).not.toContain('Not enough history');
    });
  });
});
