/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { SignalCardData } from './data';
import { SignalMetricChartCard, buildSignalMetricDatum } from './signal_metric_chart_card';

let mockSettingsProps: {
  onElementClick?: () => void;
  theme?: { metric?: { valuePosition?: string } };
} = {};
let mockMetricProps: { data: Array<Array<Record<string, unknown>>> } = { data: [[]] };

jest.mock('@kbn/charts-theme', () => ({ useElasticChartsTheme: () => ({}) }));
jest.mock('@elastic/charts', () => ({
  Chart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Settings: (props: typeof mockSettingsProps) => {
    mockSettingsProps = props;
    return null;
  },
  Metric: (props: { data: Array<Array<Record<string, unknown>>> }) => {
    mockMetricProps = props;
    return null;
  },
}));

const colors = {
  tile: '#fff',
  increaseBadge: '#fdd',
  increaseText: '#c00',
  decreaseBadge: '#dfd',
  decreaseText: '#070',
};

const card = (overrides: Partial<SignalCardData> = {}): SignalCardData => ({
  id: 'newEntity',
  title: 'New entity',
  description: 'First seen in the last 7 days',
  value: 40,
  filterLabel: 'New entity (7d)',
  ...overrides,
});

describe('buildSignalMetricDatum', () => {
  it('shows the title, the description as the subtitle and the formatted value', () => {
    const datum = buildSignalMetricDatum(card({ value: 12345 }), colors);
    expect(datum).toMatchObject({
      title: 'New entity',
      subtitle: 'First seen in the last 7 days',
      value: 12345,
    });
    expect((datum as { valueFormatter: (n: number) => string }).valueFormatter(12345)).toBe(
      (12345).toLocaleString()
    );
  });

  it('shows a dash and a spinner while the count is loading', () => {
    const datum = buildSignalMetricDatum(card({ isLoading: true }), colors);
    expect(datum.value).toBe('—');
    expect(datum.extra).toBeTruthy();
  });

  it('shows a dash and the no-data message when the count is 0, with no trend', () => {
    const datum = buildSignalMetricDatum(
      card({ value: 0, noDataMessage: 'No risk scores yet', trend: [1, 2, 3] }),
      colors
    );
    expect(datum.value).toBe('—');
    expect(datum).not.toHaveProperty('trend');
    expect(datum.extra).toBeTruthy();
  });

  it('maps an increase to a red badge with the percentage and an up arrow', () => {
    const datum = buildSignalMetricDatum(card({ value: 150, delta: 50 }), colors);
    expect(datum.extra).toMatchObject({
      value: '+50 (+50%)',
      icon: '↑',
      badgeColor: colors.increaseBadge,
      badgeTextColor: colors.increaseText,
      labelPosition: 'after',
    });
  });

  it('maps a decrease to a green badge with a down arrow', () => {
    const datum = buildSignalMetricDatum(card({ value: 50, delta: -50 }), colors);
    expect(datum.extra).toMatchObject({
      value: '-50 (-50%)',
      icon: '↓',
      badgeColor: colors.decreaseBadge,
    });
  });

  it('shows no delta badge for a zero or missing delta, and a placeholder while it loads', () => {
    expect(buildSignalMetricDatum(card({ delta: 0 }), colors).extra).toBeUndefined();
    expect(buildSignalMetricDatum(card({ delta: undefined }), colors).extra).toBeUndefined();
    expect(buildSignalMetricDatum(card({ isDeltaLoading: true }), colors).extra).toBeTruthy();
  });

  it('draws the trend as a step chart from the series values', () => {
    const datum = buildSignalMetricDatum(card({ trend: [3, 5, 4] }), colors);
    expect(datum).toMatchObject({
      trend: [
        { x: 0, y: 3 },
        { x: 1, y: 5 },
        { x: 2, y: 4 },
      ],
      trendShape: 'bars',
    });
  });

  it('leaves the trend out until the series has at least two points', () => {
    expect(buildSignalMetricDatum(card({ trend: undefined }), colors)).not.toHaveProperty('trend');
    expect(buildSignalMetricDatum(card({ trend: [4] }), colors)).not.toHaveProperty('trend');
  });
});

describe('SignalMetricChartCard', () => {
  beforeEach(() => {
    mockSettingsProps = {};
    mockMetricProps = { data: [[]] };
  });

  it('passes the card to the Metric chart as a single tile', () => {
    render(
      <SignalMetricChartCard card={card()} selected={false} dimmed={false} onToggle={jest.fn()} />
    );
    expect(mockMetricProps.data).toHaveLength(1);
    expect(mockMetricProps.data[0]).toHaveLength(1);
    expect(mockMetricProps.data[0][0]).toMatchObject({ title: 'New entity', value: 40 });
  });

  it('puts the count above the delta', () => {
    render(
      <SignalMetricChartCard card={card()} selected={false} dimmed={false} onToggle={jest.fn()} />
    );
    expect(mockSettingsProps.theme?.metric?.valuePosition).toBe('middle');
  });

  it('toggles the filter when the chart is clicked', () => {
    const onToggle = jest.fn();
    render(
      <SignalMetricChartCard card={card()} selected={false} dimmed={false} onToggle={onToggle} />
    );
    mockSettingsProps.onElementClick?.();
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('is not clickable while loading or when the count is 0', () => {
    render(
      <SignalMetricChartCard
        card={card({ isLoading: true })}
        selected={false}
        dimmed={false}
        onToggle={jest.fn()}
      />
    );
    expect(mockSettingsProps.onElementClick).toBeUndefined();
    render(
      <SignalMetricChartCard
        card={card({ value: 0 })}
        selected={false}
        dimmed={false}
        onToggle={jest.fn()}
      />
    );
    expect(mockSettingsProps.onElementClick).toBeUndefined();
  });
});
