/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { TimeRange } from '../../../../../common/entity_analytics/home/constants';
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
  props: { selected?: boolean; onToggle?: () => void; timeRange?: TimeRange } = {}
) =>
  render(
    <SignalCard
      card={card(cardOverrides)}
      selected={props.selected ?? false}
      timeRange={props.timeRange ?? '30d'}
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
    expect(tile).toHaveTextContent('vs. previous 30d');
  });

  it.each([
    ['24h', 'vs. previous 24h'],
    ['7d', 'vs. previous 7d'],
    ['30d', 'vs. previous 30d'],
  ] as const)('compares with the range before the selected %s', (timeRange, label) => {
    renderCard({ value: 12, delta: 12 }, { timeRange });
    expect(screen.getByTestId('eaFaceliftSignalCardDeltaLabel')).toHaveTextContent(label);
  });

  it('formats large changes with a thousands separator, like the main number', () => {
    const { unmount } = renderCard({ value: 5000, delta: 1627 });
    expect(screen.getByTestId('eaFaceliftSignalCardDeltaBadge')).toHaveTextContent('+1,627↑');
    unmount();

    renderCard({ value: 5000, delta: -2270 });
    expect(screen.getByTestId('eaFaceliftSignalCardDeltaBadge')).toHaveTextContent('-2,270↓');
  });

  it('shows the drop and the sparkline for a count that fell to 0, and still does not filter', () => {
    const onToggle = jest.fn();
    renderCard({ value: 0, delta: -4, trend: [4, 3, 1, 0] }, { onToggle });

    expect(screen.getByTestId('eaFaceliftSignalCardDeltaBadge')).toHaveTextContent('-4↓');
    expect(mockSeriesData).toHaveLength(4);
    const tile = screen.getByTestId('eaFaceliftSignalCard-newEntity');
    fireEvent.click(tile);
    expect(onToggle).not.toHaveBeenCalled();
    expect(tile).toHaveAttribute('aria-disabled', 'true');
  });

  it('shows a grey "0 =" badge when nothing changed', () => {
    renderCard({ delta: 0 });
    expect(screen.getByTestId('eaFaceliftSignalCardDeltaBadge')).toHaveTextContent('0=');
    expect(screen.getByTestId('eaFaceliftSignalCardDelta')).toHaveTextContent('vs. previous 30d');
  });

  it('shows no delta for a missing delta', () => {
    renderCard({ delta: undefined });
    expect(screen.queryByTestId('eaFaceliftSignalCardDelta')).not.toBeInTheDocument();
  });

  it('shows a skeleton and the progress bar while the delta loads, without the badge', () => {
    renderCard({ isDeltaLoading: true, delta: 5 });
    expect(screen.getByTestId('eaFaceliftSignalCardDeltaSkeleton')).toHaveTextContent(
      'vs. previous 30d'
    );
    expect(screen.getByTestId('eaFaceliftSignalCardProgress')).toBeInTheDocument();
    expect(screen.queryByTestId('eaFaceliftSignalCardDeltaBadge')).not.toBeInTheDocument();
    expect(screen.getByTestId('eaFaceliftSignalCard-newEntity')).toHaveAttribute(
      'aria-busy',
      'true'
    );
  });

  it('shows only the progress bar, with no line, while the sparkline loads', () => {
    renderCard({ isTrendLoading: true, delta: 5, trend: [1, 2, 3] });
    expect(screen.getByTestId('eaFaceliftSignalCardProgress')).toBeInTheDocument();
    expect(screen.queryByTestId('eaFaceliftSignalCardDeltaSkeleton')).not.toBeInTheDocument();
    expect(screen.getByTestId('eaFaceliftSignalCardDeltaBadge')).toBeInTheDocument();
    expect(mockSeriesData).toBeUndefined();
  });

  it('shows no progress bar once nothing is loading', () => {
    renderCard({ delta: 5, trend: [1, 2, 3] });
    expect(screen.queryByTestId('eaFaceliftSignalCardProgress')).not.toBeInTheDocument();
    expect(screen.getByTestId('eaFaceliftSignalCard-newEntity')).not.toHaveAttribute('aria-busy');
  });

  it('says there is not enough history to compare, in place of the delta', () => {
    renderCard({ isDeltaUnavailable: true });
    expect(screen.getByTestId('eaFaceliftSignalCardDeltaUnavailable')).toHaveTextContent(
      'Not enough history'
    );
    expect(screen.queryByTestId('eaFaceliftSignalCardDeltaBadge')).not.toBeInTheDocument();
    expect(screen.queryByTestId('eaFaceliftSignalCardDeltaLabel')).not.toBeInTheDocument();
  });

  it('says it at a zero count that came back too, but not without a count', () => {
    const { unmount } = renderCard({ value: 0, isDeltaUnavailable: true });
    expect(screen.getByTestId('eaFaceliftSignalCardDeltaUnavailable')).toBeInTheDocument();
    unmount();

    renderCard({ value: 0, hasCount: false, isDeltaUnavailable: true });
    expect(screen.queryByTestId('eaFaceliftSignalCardDeltaUnavailable')).not.toBeInTheDocument();
  });

  it('does not say it while the delta loads, or next to a delta', () => {
    const loading = renderCard({ isDeltaLoading: true, isDeltaUnavailable: true });
    expect(screen.queryByTestId('eaFaceliftSignalCardDeltaUnavailable')).not.toBeInTheDocument();
    loading.unmount();

    renderCard({ delta: 5, isDeltaUnavailable: true });
    expect(screen.queryByTestId('eaFaceliftSignalCardDeltaUnavailable')).not.toBeInTheDocument();
    expect(screen.getByTestId('eaFaceliftSignalCardDeltaBadge')).toBeInTheDocument();
  });

  it.each(['delta', 'history'] as const)(
    'says the comparison is unavailable, with an error icon, when its %s query failed',
    (deltaFailure) => {
      renderCard({ delta: undefined, deltaFailure });

      expect(screen.getByTestId('eaFaceliftSignalCardDeltaFailed')).toHaveTextContent(
        'Comparison unavailable'
      );
      expect(screen.getByTestId('eaFaceliftSignalCardIssueIcon-error')).toBeInTheDocument();
      expect(screen.queryByTestId('eaFaceliftSignalCardDeltaBadge')).not.toBeInTheDocument();
    }
  );

  it('keeps Enter and Space on a note from toggling the table filter, while the tile still does', () => {
    const onToggle = jest.fn();
    renderCard({ isDeltaUnavailable: true }, { onToggle });
    const note = screen.getByTestId('eaFaceliftSignalCardDeltaUnavailable');

    fireEvent.keyDown(note, { key: 'Enter' });
    fireEvent.keyDown(note, { key: ' ' });
    expect(onToggle).not.toHaveBeenCalled();

    // The tile itself still toggles on Enter and Space.
    const tile = screen.getByTestId('eaFaceliftSignalCard-newEntity');
    fireEvent.keyDown(tile, { key: 'Enter' });
    fireEvent.keyDown(tile, { key: ' ' });
    expect(onToggle).toHaveBeenCalledTimes(2);
  });

  it('says the comparison failed at a zero count that came back, but not without a count or while the delta loads', () => {
    const { unmount } = renderCard({ value: 0, deltaFailure: 'delta' });
    expect(screen.getByTestId('eaFaceliftSignalCardDeltaFailed')).toBeInTheDocument();
    unmount();

    const noCount = renderCard({ value: 0, hasCount: false, deltaFailure: 'delta' });
    expect(screen.queryByTestId('eaFaceliftSignalCardDeltaFailed')).not.toBeInTheDocument();
    noCount.unmount();

    renderCard({ isDeltaLoading: true, deltaFailure: 'delta' });
    expect(screen.queryByTestId('eaFaceliftSignalCardDeltaFailed')).not.toBeInTheDocument();
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

    it('says nothing changed when the change is 0', () => {
      renderCard({ delta: 0 });
      expect(tile()).toHaveAttribute(
        'aria-label',
        'New entity. No change compared with the previous period'
      );
    });

    it('stays the title alone while the delta loads or when there is no count', () => {
      const loading = renderCard({ isDeltaLoading: true, delta: 5 });
      expect(tile()).toHaveAttribute('aria-label', 'New entity');
      loading.unmount();

      renderCard({ value: 0, hasCount: false, delta: 5 });
      expect(tile()).toHaveAttribute('aria-label', 'New entity');
    });

    it('says the drop at a zero count that came back', () => {
      renderCard({ value: 0, delta: -4 });
      expect(tile()).toHaveAttribute(
        'aria-label',
        'New entity. Down 4 compared with the previous period'
      );
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

  it('shows skeletons for the count and the change and the progress bar while the count loads, and is not clickable', () => {
    const onToggle = jest.fn();
    renderCard({ isLoading: true }, { onToggle });
    const tile = screen.getByTestId('eaFaceliftSignalCard-newEntity');

    expect(screen.getByTestId('eaFaceliftSignalCardCountSkeleton')).toBeInTheDocument();
    expect(screen.getByTestId('eaFaceliftSignalCardDeltaSkeleton')).toBeInTheDocument();
    expect(screen.getByTestId('eaFaceliftSignalCardProgress')).toBeInTheDocument();
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

  it('stays clickable at 0 while selected, so its filter can be cleared', () => {
    const onToggle = jest.fn();
    renderCard({ value: 0, hasCount: true }, { onToggle, selected: true });
    const tile = screen.getByTestId('eaFaceliftSignalCard-newEntity');

    expect(tile).toHaveAttribute('aria-pressed', 'true');
    expect(tile).not.toHaveAttribute('aria-disabled');
    fireEvent.click(tile);
    expect(onToggle).toHaveBeenCalledTimes(1);
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

  it('shows N/A and the reason instead of the count, with no delta, no sparkline and no click', () => {
    const onToggle = jest.fn();
    renderCard(
      {
        value: 0,
        countIssue: {
          kind: 'issue',
          cause: 'missing',
          icon: 'warning',
          text: 'Requires an alerts index',
          tooltip: 'This space has no alerts index yet.',
        },
        delta: 5,
        trend: [1, 2, 3],
      },
      { onToggle }
    );
    const tile = screen.getByTestId('eaFaceliftSignalCard-newEntity');

    expect(screen.getByTestId('eaFaceliftSignalCardUnavailable')).toHaveTextContent('N/A');
    expect(tile).not.toHaveTextContent('—');
    expect(screen.getByTestId('eaFaceliftSignalCardCountIssue')).toHaveTextContent(
      'Requires an alerts index'
    );
    expect(screen.getByTestId('eaFaceliftSignalCardIssueIcon-warning')).toBeInTheDocument();
    expect(screen.queryByTestId('eaFaceliftSignalCardDelta')).not.toBeInTheDocument();
    expect(mockSeriesData).toBeUndefined();
    fireEvent.click(tile);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('uses an error icon when the count failed', () => {
    renderCard({
      value: 0,
      hasCount: false,
      countIssue: {
        kind: 'issue',
        cause: 'failed',
        icon: 'error',
        text: "Couldn't load data",
        tooltip: "This metric couldn't load. Refresh the page to try again.",
      },
    });

    expect(screen.getByTestId('eaFaceliftSignalCardUnavailable')).toHaveTextContent('N/A');
    expect(screen.getByTestId('eaFaceliftSignalCardIssueIcon-error')).toBeInTheDocument();
  });

  it('says which access is missing, with a lock instead of N/A, and does not filter on click', () => {
    const onToggle = jest.fn();
    renderCard(
      { value: 0, countIssue: { kind: 'locked', text: 'Requires read access to alerts' } },
      { onToggle }
    );

    expect(screen.getByTestId('eaFaceliftSignalCardLocked')).toHaveTextContent(
      'Requires read access to alerts'
    );
    expect(screen.queryByTestId('eaFaceliftSignalCardUnavailable')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('eaFaceliftSignalCard-newEntity'));
    expect(onToggle).not.toHaveBeenCalled();
  });
});
