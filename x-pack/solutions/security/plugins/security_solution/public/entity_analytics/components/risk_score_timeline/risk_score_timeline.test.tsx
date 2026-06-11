/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';
import { EntityType } from '../../../../common/entity_analytics/types';
import { RiskScoreTimeline } from './risk_score_timeline';

const mockSettings = jest.fn();
const mockLineSeries = jest.fn();
const mockLineAnnotation = jest.fn();

jest.mock('@elastic/charts', () => {
  const original = jest.requireActual('@elastic/charts');
  return {
    ...original,
    Chart: ({ children }: { children: React.ReactNode }) => (
      <div data-test-subj="mockChart">{children}</div>
    ),
    Settings: (props: Record<string, unknown>) => {
      mockSettings(props);
      return null;
    },
    Axis: () => null,
    LineSeries: (props: Record<string, unknown>) => {
      mockLineSeries(props);
      return null;
    },
    LineAnnotation: (props: Record<string, unknown>) => {
      mockLineAnnotation(props);
      return null;
    },
  };
});

const mockUseRiskScoreHistory = jest.fn();
jest.mock('../../api/hooks/use_risk_score_history', () => ({
  useRiskScoreHistory: (params: unknown) => mockUseRiskScoreHistory(params),
}));

const entries = [
  {
    '@timestamp': '2026-01-01T00:00:00.000Z',
    calculated_score_norm: 20,
    calculated_level: 'Low',
  },
  {
    '@timestamp': '2026-01-10T00:00:00.000Z',
    calculated_score_norm: 50,
    calculated_level: 'Moderate',
  },
  {
    '@timestamp': '2026-01-20T00:00:00.000Z',
    calculated_score_norm: 80,
    calculated_level: 'High',
  },
];

const defaultProps = {
  entityType: EntityType.user,
  entityId: 'user:test-id',
  from: 'now-90d',
  to: 'now',
  onPointSelect: jest.fn(),
  onRangeChange: jest.fn(),
};

const renderTimeline = (props: Partial<React.ComponentProps<typeof RiskScoreTimeline>> = {}) =>
  render(
    <TestProviders>
      <RiskScoreTimeline {...defaultProps} {...props} />
    </TestProviders>
  );

describe('RiskScoreTimeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRiskScoreHistory.mockReturnValue({
      data: { entity_id: 'user:test-id', entity_type: 'user', entries },
      isLoading: false,
      error: null,
    });
  });

  it('renders the chart with the history entries', () => {
    const { getByTestId } = renderTimeline();

    expect(getByTestId('riskScoreTimeline')).toBeInTheDocument();
    expect(getByTestId('mockChart')).toBeInTheDocument();
    expect(mockLineSeries).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          [Date.parse('2026-01-01T00:00:00.000Z'), 20],
          [Date.parse('2026-01-10T00:00:00.000Z'), 50],
          [Date.parse('2026-01-20T00:00:00.000Z'), 80],
        ],
      })
    );
  });

  it('renders the loading state', () => {
    mockUseRiskScoreHistory.mockReturnValue({ data: undefined, isLoading: true, error: null });

    const { getByTestId, queryByTestId } = renderTimeline();

    expect(getByTestId('riskScoreTimeline-Loading')).toBeInTheDocument();
    expect(queryByTestId('mockChart')).not.toBeInTheDocument();
  });

  it('renders the empty state when there is no history', () => {
    mockUseRiskScoreHistory.mockReturnValue({
      data: { entity_id: 'user:test-id', entity_type: 'user', entries: [] },
      isLoading: false,
      error: null,
    });

    const { getByTestId } = renderTimeline();

    expect(getByTestId('riskScoreTimeline-Empty')).toBeInTheDocument();
  });

  it('renders the error state', () => {
    mockUseRiskScoreHistory.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('boom'),
    });

    const { getByTestId } = renderTimeline();

    expect(getByTestId('riskScoreTimeline-Error')).toBeInTheDocument();
  });

  it('selects the nearest entry timestamp on projection click', () => {
    const onPointSelect = jest.fn();
    renderTimeline({ onPointSelect });

    const { onProjectionClick } = mockSettings.mock.calls[0][0];
    // closest to the second entry (2026-01-10)
    onProjectionClick({ x: Date.parse('2026-01-12T00:00:00.000Z'), y: [] });

    expect(onPointSelect).toHaveBeenCalledWith('2026-01-10T00:00:00.000Z');
  });

  it('clears the selection when the selected point is clicked again', () => {
    const onPointSelect = jest.fn();
    renderTimeline({ onPointSelect, selectedTimestamp: '2026-01-10T00:00:00.000Z' });

    const { onProjectionClick } = mockSettings.mock.calls[0][0];
    onProjectionClick({ x: Date.parse('2026-01-10T00:00:00.000Z'), y: [] });

    expect(onPointSelect).toHaveBeenCalledWith(undefined);
  });

  it('ignores projection clicks without an x value', () => {
    const onPointSelect = jest.fn();
    renderTimeline({ onPointSelect });

    const { onProjectionClick } = mockSettings.mock.calls[0][0];
    onProjectionClick({ x: null, y: [] });

    expect(onPointSelect).not.toHaveBeenCalled();
  });

  it('renders threshold annotations for each risk level boundary', () => {
    renderTimeline();

    const annotationIds = mockLineAnnotation.mock.calls.map(([props]) => props.id);
    expect(annotationIds).toEqual(
      expect.arrayContaining([
        'riskScoreTimelineThreshold-Low',
        'riskScoreTimelineThreshold-Moderate',
        'riskScoreTimelineThreshold-High',
        'riskScoreTimelineThreshold-Critical',
      ])
    );
  });

  it('renders a selection annotation when a timestamp is selected', () => {
    renderTimeline({ selectedTimestamp: '2026-01-10T00:00:00.000Z' });

    const annotationIds = mockLineAnnotation.mock.calls.map(([props]) => props.id);
    expect(annotationIds).toContain('riskScoreTimelineSelection');
  });

  it('does not render a selection annotation without a selection', () => {
    renderTimeline();

    const annotationIds = mockLineAnnotation.mock.calls.map(([props]) => props.id);
    expect(annotationIds).not.toContain('riskScoreTimelineSelection');
  });

  it('notifies range changes from the preset buttons', () => {
    const onRangeChange = jest.fn();
    const { getByRole } = renderTimeline({ onRangeChange });

    fireEvent.click(getByRole('button', { name: '30d' }));

    expect(onRangeChange).toHaveBeenCalledWith('now-30d');
  });

  it('fetches history for the given range', () => {
    renderTimeline();

    expect(mockUseRiskScoreHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: EntityType.user,
        entityId: 'user:test-id',
        from: 'now-90d',
        to: 'now',
        pageSize: 1000,
      })
    );
  });
});
