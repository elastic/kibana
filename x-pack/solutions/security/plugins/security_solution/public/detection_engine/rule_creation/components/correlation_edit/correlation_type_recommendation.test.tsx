/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { CorrelationTypeRecommendationCallout } from './correlation_type_recommendation';
import type { CorrelationTypeRecommendationWithStats } from './use_correlation_type_recommendation';

const createRecommendation = (
  overrides: Partial<CorrelationTypeRecommendationWithStats> = {}
): CorrelationTypeRecommendationWithStats => ({
  type: 'temporal',
  confidence: 'high',
  reason: 'Alerts follow a temporal pattern',
  ...overrides,
});

const defaultProps = {
  recommendation: createRecommendation(),
  currentType: 'event_count',
  onApply: jest.fn(),
};

const queryByTestSubj = (container: HTMLElement, subj: string) =>
  container.querySelector(`[data-test-subj="${subj}"]`);

describe('CorrelationTypeRecommendationCallout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when recommendation is undefined', () => {
    const { container } = render(
      <CorrelationTypeRecommendationCallout
        recommendation={undefined}
        currentType="temporal"
        onApply={jest.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('returns null when recommendation type matches currentType', () => {
    const { container } = render(
      <CorrelationTypeRecommendationCallout
        recommendation={createRecommendation({ type: 'temporal' })}
        currentType="temporal"
        onApply={jest.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows loading spinner when isLoading is true', () => {
    const { container, getByText } = render(
      <CorrelationTypeRecommendationCallout
        recommendation={undefined}
        currentType="temporal"
        onApply={jest.fn()}
        isLoading
      />
    );
    expect(queryByTestSubj(container, 'correlationTypeRecommendationLoading')).toBeInTheDocument();
    expect(getByText('Loading recommendation...')).toBeInTheDocument();
  });

  it('renders recommendation with type name, confidence badge, and reason', () => {
    const { container, getByText } = render(
      <CorrelationTypeRecommendationCallout {...defaultProps} />
    );
    expect(queryByTestSubj(container, 'correlationTypeRecommendation')).toBeInTheDocument();
    expect(getByText('Temporal')).toBeInTheDocument();
    expect(getByText('High confidence')).toBeInTheDocument();
    expect(getByText('Alerts follow a temporal pattern')).toBeInTheDocument();
  });

  it('renders medium confidence badge with warning color', () => {
    const { getByText } = render(
      <CorrelationTypeRecommendationCallout
        {...defaultProps}
        recommendation={createRecommendation({ confidence: 'medium' })}
      />
    );
    expect(getByText('Medium confidence')).toBeInTheDocument();
  });

  it('renders low confidence badge with default color', () => {
    const { getByText } = render(
      <CorrelationTypeRecommendationCallout
        {...defaultProps}
        recommendation={createRecommendation({ confidence: 'low' })}
      />
    );
    expect(getByText('Low confidence')).toBeInTheDocument();
  });

  it('renders all type display names correctly', () => {
    const types = [
      { type: 'temporal_ordered' as const, label: 'Temporal Ordered' },
      { type: 'event_count' as const, label: 'Event Count' },
      { type: 'value_count' as const, label: 'Value Count' },
    ];

    for (const { type, label } of types) {
      const { getByText, unmount } = render(
        <CorrelationTypeRecommendationCallout
          recommendation={createRecommendation({ type })}
          currentType="temporal"
          onApply={jest.fn()}
        />
      );
      expect(getByText(label)).toBeInTheDocument();
      unmount();
    }
  });

  it('calls onApply with the recommendation type when apply button is clicked', () => {
    const onApply = jest.fn();
    const { container } = render(
      <CorrelationTypeRecommendationCallout
        {...defaultProps}
        recommendation={createRecommendation({ type: 'temporal_ordered' })}
        onApply={onApply}
      />
    );
    const applyButton = queryByTestSubj(container, 'correlationTypeRecommendationApply');
    expect(applyButton).toBeInTheDocument();
    fireEvent.click(applyButton!);
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith('temporal_ordered');
  });

  describe('stats accordion', () => {
    const statsRecommendation = createRecommendation({
      stats: {
        alertCountPerRule: { 'Rule A': 15, 'Rule B': 8 },
        groupByCardinality: { 'host.name': 42 },
        avgTimeBetweenAlerts: 5000,
      },
    });

    it('renders the accordion when stats are provided', () => {
      const { container } = render(
        <CorrelationTypeRecommendationCallout
          {...defaultProps}
          recommendation={statsRecommendation}
        />
      );
      expect(
        queryByTestSubj(container, 'correlationTypeRecommendationDetails')
      ).toBeInTheDocument();
    });

    it('does not render the accordion when stats are not provided', () => {
      const { container } = render(<CorrelationTypeRecommendationCallout {...defaultProps} />);
      expect(
        queryByTestSubj(container, 'correlationTypeRecommendationDetails')
      ).not.toBeInTheDocument();
    });

    it('shows server-side analysis badge when stats are present', () => {
      const { getByText } = render(
        <CorrelationTypeRecommendationCallout
          {...defaultProps}
          recommendation={statsRecommendation}
        />
      );
      expect(getByText('Server-side analysis')).toBeInTheDocument();
    });

    it('displays formatted alert counts per rule (formatRecord)', () => {
      const { getByText } = render(
        <CorrelationTypeRecommendationCallout
          {...defaultProps}
          recommendation={statsRecommendation}
        />
      );
      expect(getByText('Alert counts per rule')).toBeInTheDocument();
      expect(getByText('Rule A: 15, Rule B: 8')).toBeInTheDocument();
    });

    it('displays formatted cardinality (formatRecord)', () => {
      const { getByText } = render(
        <CorrelationTypeRecommendationCallout
          {...defaultProps}
          recommendation={statsRecommendation}
        />
      );
      expect(getByText('Group-by field cardinality')).toBeInTheDocument();
      expect(getByText('host.name: 42')).toBeInTheDocument();
    });

    it('displays formatted average time in seconds (formatMs)', () => {
      const { getByText } = render(
        <CorrelationTypeRecommendationCallout
          {...defaultProps}
          recommendation={statsRecommendation}
        />
      );
      expect(getByText('Average time between alerts')).toBeInTheDocument();
      expect(getByText('5.0s')).toBeInTheDocument();
    });

    it('displays time in milliseconds for values under 1000ms', () => {
      const { getByText } = render(
        <CorrelationTypeRecommendationCallout
          {...defaultProps}
          recommendation={createRecommendation({
            stats: {
              alertCountPerRule: { 'Rule A': 1 },
              groupByCardinality: { 'host.name': 1 },
              avgTimeBetweenAlerts: 750,
            },
          })}
        />
      );
      expect(getByText('750ms')).toBeInTheDocument();
    });

    it('rounds millisecond values', () => {
      const { getByText } = render(
        <CorrelationTypeRecommendationCallout
          {...defaultProps}
          recommendation={createRecommendation({
            stats: {
              alertCountPerRule: {},
              groupByCardinality: {},
              avgTimeBetweenAlerts: 123.456,
            },
          })}
        />
      );
      expect(getByText('123ms')).toBeInTheDocument();
    });

    it('displays time in minutes for values >= 60000ms', () => {
      const { getByText } = render(
        <CorrelationTypeRecommendationCallout
          {...defaultProps}
          recommendation={createRecommendation({
            stats: {
              alertCountPerRule: { 'Rule A': 1 },
              groupByCardinality: { 'host.name': 1 },
              avgTimeBetweenAlerts: 90000,
            },
          })}
        />
      );
      expect(getByText('1.5m')).toBeInTheDocument();
    });

    it('shows "N/A" when avgTimeBetweenAlerts is null', () => {
      const { getByText } = render(
        <CorrelationTypeRecommendationCallout
          {...defaultProps}
          recommendation={createRecommendation({
            stats: {
              alertCountPerRule: { 'Rule A': 10 },
              groupByCardinality: { 'host.name': 5 },
              avgTimeBetweenAlerts: null,
            },
          })}
        />
      );
      expect(getByText('N/A')).toBeInTheDocument();
    });

    it('shows "None" for empty record maps (formatRecord)', () => {
      const { getAllByText } = render(
        <CorrelationTypeRecommendationCallout
          {...defaultProps}
          recommendation={createRecommendation({
            stats: {
              alertCountPerRule: {},
              groupByCardinality: {},
              avgTimeBetweenAlerts: 1000,
            },
          })}
        />
      );
      expect(getAllByText('None')).toHaveLength(2);
    });
  });
});
