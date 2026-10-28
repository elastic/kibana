/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { SignalCardData } from './data';
import { SignalCard } from './signal_card';

let mockSeriesData: Array<{ x: number; y: number }> | undefined;

jest.mock('@kbn/charts-theme', () => ({ useElasticChartsTheme: () => ({}) }));
jest.mock('@elastic/charts', () => ({
  Chart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Settings: () => null,
  Axis: () => null,
  AreaSeries: ({ data }: { data: Array<{ x: number; y: number }> }) => {
    mockSeriesData = data;
    return null;
  },
  Position: { Left: 'left' },
  ScaleType: { Linear: 'linear' },
  CurveType: { CURVE_STEP: 'curveStep' },
}));

const card = (overrides: Partial<SignalCardData> = {}): SignalCardData => ({
  id: 'newEntity',
  title: 'New entity',
  description: 'First seen in the last 7 days',
  value: 12345,
  hasCount: true,
  filterLabel: 'New entity (7d)',
  ...overrides,
});

const renderCard = (
  cardOverrides: Partial<SignalCardData> = {},
  props: { selected?: boolean; onToggle?: () => void } = {}
) =>
  render(
    <SignalCard
      card={card(cardOverrides)}
      selected={props.selected ?? false}
      onToggle={props.onToggle ?? jest.fn()}
    />
  );

describe('SignalCard', () => {
  it('shows the selected dot only while the tile is selected', () => {
    const { unmount } = renderCard({}, { selected: false });
    expect(screen.queryByTestId('eaFaceliftSignalCardSelectedDot')).not.toBeInTheDocument();
    unmount();

    renderCard({}, { selected: true });
    expect(screen.getByTestId('eaFaceliftSignalCardSelectedDot')).toBeInTheDocument();
  });

  beforeEach(() => {
    mockSeriesData = undefined;
  });

  it('shows the title, the description and the formatted count', () => {
    renderCard({ value: 5678 });
    const tile = screen.getByTestId('eaFaceliftSignalCard-newEntity');
    expect(tile).toHaveTextContent('New entity');
    expect(tile).toHaveTextContent('First seen in the last 7 days');
    expect(tile).toHaveTextContent('5,678');
  });

  it.each([
    [9999, '9,999'],
    [10000, '10K'],
    [10500, '10.5K'],
    [12345, '12.3K'],
    [1234567, '1.2M'],
  ])('shortens the count from 10,000 on: %d shows as %s', (value, shown) => {
    renderCard({ value });
    expect(screen.getByTestId('eaFaceliftSignalCard-newEntity')).toHaveTextContent(shown);
  });

  it.each([
    [9999, '+9,999↑'],
    [10000, '+10K↑'],
    [10500, '+10.5K↑'],
    [-12345, '-12.3K↓'],
  ])('shortens the change from 10,000 on: %d shows as %s', (delta, shown) => {
    renderCard({ value: 50000, delta });
    expect(screen.getByTestId('eaFaceliftSignalCardDeltaBadge')).toHaveTextContent(shown);
  });

  it('shows an increase as +n with an up arrow, and a decrease as -n with a down arrow', () => {
    const { unmount } = renderCard({ delta: 50 });
    expect(screen.getByTestId('eaFaceliftSignalCardDeltaBadge')).toHaveTextContent('+50↑');
    unmount();

    renderCard({ delta: -50 });
    expect(screen.getByTestId('eaFaceliftSignalCardDeltaBadge')).toHaveTextContent('-50↓');
  });

  it('shows the change as a plain number, with no percentage', () => {
    renderCard({ value: 12, delta: 12 });
    const tile = screen.getByTestId('eaFaceliftSignalCard-newEntity');
    expect(screen.getByTestId('eaFaceliftSignalCardDeltaBadge')).toHaveTextContent('+12↑');
    expect(tile).not.toHaveTextContent('%');
    expect(tile).toHaveTextContent('vs previous period');
  });

  it('formats large changes with a thousands separator, like the main number', () => {
    const { unmount } = renderCard({ value: 5000, delta: 1627 });
    expect(screen.getByTestId('eaFaceliftSignalCardDeltaBadge')).toHaveTextContent('+1,627↑');
    unmount();

    renderCard({ value: 5000, delta: -2270 });
    expect(screen.getByTestId('eaFaceliftSignalCardDeltaBadge')).toHaveTextContent('-2,270↓');
  });

  it('shows no delta for a zero or missing delta', () => {
    const { unmount } = renderCard({ delta: 0 });
    expect(screen.queryByTestId('eaFaceliftSignalCardDelta')).not.toBeInTheDocument();
    unmount();

    renderCard({ delta: undefined });
    expect(screen.queryByTestId('eaFaceliftSignalCardDelta')).not.toBeInTheDocument();
  });

  it('shows a spinner next to the label while the delta loads, without the badge', () => {
    renderCard({ isDeltaLoading: true, delta: 5 });
    expect(screen.getByTestId('eaFaceliftSignalCardDeltaLabel')).toBeInTheDocument();
    expect(screen.queryByTestId('eaFaceliftSignalCardDeltaBadge')).not.toBeInTheDocument();
  });

  it('says there is not enough history to compare, in place of the delta', () => {
    renderCard({ isDeltaUnavailable: true });
    expect(screen.getByTestId('eaFaceliftSignalCardDeltaUnavailable')).toHaveTextContent(
      'Not enough history to compare'
    );
    expect(screen.queryByTestId('eaFaceliftSignalCardDeltaBadge')).not.toBeInTheDocument();
    expect(screen.queryByTestId('eaFaceliftSignalCardDeltaLabel')).not.toBeInTheDocument();
  });

  it('does not say it at a zero count, or while the delta loads, or next to a delta', () => {
    const { unmount } = renderCard({ value: 0, isDeltaUnavailable: true });
    expect(screen.queryByTestId('eaFaceliftSignalCardDeltaUnavailable')).not.toBeInTheDocument();
    unmount();

    const loading = renderCard({ isDeltaLoading: true, isDeltaUnavailable: true });
    expect(screen.queryByTestId('eaFaceliftSignalCardDeltaUnavailable')).not.toBeInTheDocument();
    loading.unmount();

    renderCard({ delta: 5, isDeltaUnavailable: true });
    expect(screen.queryByTestId('eaFaceliftSignalCardDeltaUnavailable')).not.toBeInTheDocument();
    expect(screen.getByTestId('eaFaceliftSignalCardDeltaBadge')).toBeInTheDocument();
  });

  describe('accessible name', () => {
    const tile = () => screen.getByTestId('eaFaceliftSignalCard-newEntity');

    it('is the title alone when the tile shows no delta', () => {
      renderCard({ delta: undefined });
      expect(tile()).toHaveAttribute('aria-label', 'New entity');
    });

    it('adds the change when the tile shows a delta', () => {
      const up = renderCard({ delta: 1234 });
      expect(tile()).toHaveAttribute(
        'aria-label',
        'New entity. Up 1,234 compared with the previous period'
      );
      up.unmount();

      renderCard({ delta: -3 });
      expect(tile()).toHaveAttribute(
        'aria-label',
        'New entity. Down 3 compared with the previous period'
      );
    });

    it('says the exact change where the badge shortens it', () => {
      renderCard({ value: 50000, delta: 10512 });
      expect(screen.getByTestId('eaFaceliftSignalCardDeltaBadge')).toHaveTextContent('+10.5K↑');
      expect(tile()).toHaveAttribute(
        'aria-label',
        'New entity. Up 10,512 compared with the previous period'
      );
    });

    it('adds that the history is too short when the tile says so', () => {
      renderCard({ isDeltaUnavailable: true });
      expect(tile()).toHaveAttribute('aria-label', 'New entity. Not enough history to compare');
    });

    it('stays the title alone while the delta loads or at a zero count', () => {
      const loading = renderCard({ isDeltaLoading: true, delta: 5 });
      expect(tile()).toHaveAttribute('aria-label', 'New entity');
      loading.unmount();

      renderCard({ value: 0, delta: 5 });
      expect(tile()).toHaveAttribute('aria-label', 'New entity');
    });
  });

  it('draws the sparkline from the series values', () => {
    renderCard({ trend: [3, 5, 4] });
    expect(mockSeriesData).toEqual([
      { x: 0, y: 3 },
      { x: 1, y: 5 },
      { x: 2, y: 4 },
    ]);
  });

  it('leaves the sparkline out while the tile says there is not enough history to compare', () => {
    renderCard({ trend: [3, 5, 4], isDeltaUnavailable: true });
    expect(mockSeriesData).toBeUndefined();
    expect(screen.getByTestId('eaFaceliftSignalCardDeltaUnavailable')).toBeInTheDocument();
  });

  it('still draws the sparkline when the history is long enough', () => {
    renderCard({ trend: [3, 5, 4], isDeltaUnavailable: false });
    expect(mockSeriesData).toHaveLength(3);
  });

  it('leaves the sparkline out until the series has at least two points', () => {
    renderCard({ trend: undefined });
    expect(mockSeriesData).toBeUndefined();
    renderCard({ trend: [4] });
    expect(mockSeriesData).toBeUndefined();
  });

  it('toggles the filter on click, Enter and Space', () => {
    const onToggle = jest.fn();
    renderCard({}, { onToggle });
    const tile = screen.getByTestId('eaFaceliftSignalCard-newEntity');

    fireEvent.click(tile);
    fireEvent.keyDown(tile, { key: 'Enter' });
    fireEvent.keyDown(tile, { key: ' ' });

    expect(onToggle).toHaveBeenCalledTimes(3);
  });

  it('keeps one control per tile: no button nested in the selected tile, which clears the filter itself', () => {
    const onToggle = jest.fn();
    renderCard({}, { selected: true, onToggle });
    const tile = screen.getByTestId('eaFaceliftSignalCard-newEntity');

    expect(screen.getByTestId('eaFaceliftSignalCardSelectedDot')).toBeInTheDocument();
    expect(screen.queryByTestId('eaFaceliftSignalCardClearFilter')).not.toBeInTheDocument();
    // The tile is the only interactive element, and the only tab stop, inside it.
    expect(
      tile.querySelectorAll('button, a, input, select, textarea, [role], [tabindex]')
    ).toHaveLength(0);
    expect(tile).toHaveAttribute('tabindex', '0');
    expect(tile).toHaveAttribute('aria-pressed', 'true');

    fireEvent.keyDown(tile, { key: 'Enter' });
    fireEvent.click(tile);
    expect(onToggle).toHaveBeenCalledTimes(2);
  });

  it('shows a dash and a spinner while the count loads, and is not clickable', () => {
    const onToggle = jest.fn();
    renderCard({ isLoading: true }, { onToggle });
    const tile = screen.getByTestId('eaFaceliftSignalCard-newEntity');

    expect(screen.getByTestId('eaFaceliftSignalCardLoading')).toBeInTheDocument();
    fireEvent.click(tile);
    fireEvent.keyDown(tile, { key: 'Enter' });
    expect(onToggle).not.toHaveBeenCalled();
    expect(tile).toHaveAttribute('aria-disabled', 'true');
  });

  it('shows 0, not a dash, for a count that genuinely came back 0, and is not clickable', () => {
    const onToggle = jest.fn();
    renderCard({ value: 0, hasCount: true }, { onToggle });
    const tile = screen.getByTestId('eaFaceliftSignalCard-newEntity');

    expect(tile).toHaveTextContent('0');
    expect(tile).not.toHaveTextContent('—');
    fireEvent.click(tile);
    fireEvent.keyDown(tile, { key: 'Enter' });
    expect(onToggle).not.toHaveBeenCalled();
    expect(tile).toHaveAttribute('aria-disabled', 'true');
  });

  it('shows a dash, not 0, when there is no count (failed, skipped, timed out or no access)', () => {
    const onToggle = jest.fn();
    renderCard({ value: 0, hasCount: false }, { onToggle });
    const tile = screen.getByTestId('eaFaceliftSignalCard-newEntity');

    expect(tile).toHaveTextContent('—');
    expect(tile).not.toHaveTextContent('0');
    fireEvent.click(tile);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('shows the no-data message instead of the dash at 0, with no delta, no sparkline and no click', () => {
    const onToggle = jest.fn();
    renderCard(
      { value: 0, noDataMessage: 'No risk scores yet', delta: 5, trend: [1, 2, 3] },
      { onToggle }
    );
    const tile = screen.getByTestId('eaFaceliftSignalCard-newEntity');

    expect(tile).not.toHaveTextContent('—');
    expect(tile).toHaveTextContent('No risk scores yet');
    expect(screen.queryByTestId('eaFaceliftSignalCardDelta')).not.toBeInTheDocument();
    expect(mockSeriesData).toBeUndefined();
    fireEvent.click(tile);
    expect(onToggle).not.toHaveBeenCalled();
  });
});
