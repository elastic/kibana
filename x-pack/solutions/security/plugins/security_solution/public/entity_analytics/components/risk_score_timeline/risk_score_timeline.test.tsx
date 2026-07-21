/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';
import { EntityType } from '../../../../common/entity_analytics/types';
import { RiskScoreTimeline } from './risk_score_timeline';

const mockSettings = jest.fn();
const mockLineSeries = jest.fn();
const mockLineAnnotation = jest.fn();
const mockAxis = jest.fn();
const mockDateRangePickerOnChange = jest.fn();

jest.mock('@kbn/date-range-picker', () => ({
  DateRangePicker: ({
    onChange,
    value,
    'data-test-subj': dataTestSubj,
  }: {
    onChange: (args: { start: string; end: string; value: string; isInvalid: boolean }) => void;
    value?: string;
    'data-test-subj'?: string;
  }) => {
    mockDateRangePickerOnChange.mockImplementation(onChange);
    return (
      <button
        type="button"
        data-test-subj={dataTestSubj ?? 'riskScoreTimeline-DateRangePicker'}
        data-value={value}
        onClick={() =>
          onChange({
            start: 'now-30d',
            end: 'now',
            value: 'Last 30 days',
            isInvalid: false,
          })
        }
      />
    );
  },
}));

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
    Tooltip: () => null,
    Axis: (props: Record<string, unknown>) => {
      mockAxis(props);
      return null;
    },
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
  from: '2026-01-01T00:00:00.000Z',
  to: '2026-01-20T23:59:59.999Z',
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
      data: { entity_id: 'user:test-id', entity_type: 'user', interval: '1d', entries },
      isLoading: false,
      error: undefined,
    });
  });

  it('renders the chart with densified daily history entries', () => {
    const { getByTestId } = renderTimeline();

    expect(getByTestId('riskScoreTimeline')).toBeInTheDocument();
    expect(getByTestId('mockChart')).toBeInTheDocument();
    const seriesProps = mockLineSeries.mock.calls[0][0];
    const data = seriesProps.data as Array<[number, number]>;
    // 1 Jan → 20 Jan inclusive = 20 daily points
    expect(data).toHaveLength(20);
    expect(data[0]).toEqual([Date.parse('2026-01-01T00:00:00.000Z'), 20]);
    expect(data[data.length - 1][1]).toBe(80);
    expect(seriesProps.name).toBe('Max risk score');
    expect(seriesProps.curve).toBe(9); // CurveType.LINEAR
    expect(seriesProps.tickFormat(55)).toBe('55.00');
    expect(seriesProps.tickFormat(72.4)).toBe('72.40');
  });

  it('labels the hourly series as Risk score', () => {
    mockUseRiskScoreHistory.mockReturnValue({
      data: {
        entity_id: 'user:test-id',
        entity_type: 'user',
        interval: '1h',
        entries: [
          {
            '@timestamp': new Date(2026, 0, 10, 8).toISOString(),
            calculated_score_norm: 40.5,
            calculated_level: 'Moderate',
          },
        ],
      },
      isLoading: false,
      error: undefined,
    });

    const dayStart = new Date(2026, 0, 10);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
    renderTimeline({
      from: dayStart.toISOString(),
      to: dayEnd.toISOString(),
    });

    expect(mockLineSeries.mock.calls[0][0].name).toBe('Risk score');
  });

  it('configures filled points, hover highlighter, and grey dashed crosshairs', () => {
    renderTimeline();

    expect(mockSettings.mock.calls[0][0].theme).toEqual(
      expect.objectContaining({
        lineSeriesStyle: expect.objectContaining({
          point: expect.objectContaining({
            visible: 'always',
            fill: '__use__series__color__',
            strokeWidth: 0,
            radius: 3,
          }),
        }),
        highlighter: expect.objectContaining({
          point: expect.objectContaining({
            onHover: expect.objectContaining({
              opacity: 0.5,
              radius: 5,
            }),
          }),
        }),
        crosshair: expect.objectContaining({
          line: expect.objectContaining({ dash: [4, 4], visible: true }),
          crossLine: expect.objectContaining({ dash: [4, 4], visible: true }),
        }),
      })
    );
  });

  it('renders the loading state', () => {
    mockUseRiskScoreHistory.mockReturnValue({ data: undefined, isLoading: true, error: undefined });

    const { getByTestId, queryByTestId } = renderTimeline();

    expect(getByTestId('riskScoreTimeline-Loading')).toBeInTheDocument();
    expect(queryByTestId('mockChart')).not.toBeInTheDocument();
  });

  it('renders the empty state when there is no history', () => {
    mockUseRiskScoreHistory.mockReturnValue({
      data: { entity_id: 'user:test-id', entity_type: 'user', entries: [] },
      isLoading: false,
      error: undefined,
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

  it('drills into a day on projection click in the daily view', () => {
    const onPointSelect = jest.fn();
    const onRangeChange = jest.fn();
    renderTimeline({ onPointSelect, onRangeChange });

    const { onProjectionClick } = mockSettings.mock.calls[0][0];
    // densified daily points exist for every day — click lands on 2026-01-12
    const clicked = Date.parse('2026-01-12T00:00:00.000Z');
    act(() => {
      onProjectionClick({ x: clicked, y: [] });
    });

    const dayStart = new Date(clicked);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

    expect(onPointSelect).toHaveBeenCalledWith(undefined);
    expect(onRangeChange).toHaveBeenCalledWith({
      from: dayStart.toISOString(),
      to: dayEnd.toISOString(),
    });
  });

  it('selects the nearest entry timestamp on projection click in the hourly view', () => {
    const onPointSelect = jest.fn();
    const hour8 = new Date(2026, 0, 10, 8);
    const hour14 = new Date(2026, 0, 10, 14);
    const hour20 = new Date(2026, 0, 10, 20);
    const hourlyEntries = [
      {
        '@timestamp': hour8.toISOString(),
        calculated_score_norm: 40,
        calculated_level: 'Moderate',
      },
      {
        '@timestamp': hour14.toISOString(),
        calculated_score_norm: 55,
        calculated_level: 'Moderate',
      },
      {
        '@timestamp': hour20.toISOString(),
        calculated_score_norm: 60,
        calculated_level: 'Moderate',
      },
    ];
    mockUseRiskScoreHistory.mockReturnValue({
      data: { entity_id: 'user:test-id', entity_type: 'user', interval: '1h', entries: hourlyEntries },
      isLoading: false,
      error: undefined,
    });

    // Use an explicit local-day range so densify covers a full past calendar day.
    const dayStart = new Date(2026, 0, 10);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

    renderTimeline({
      onPointSelect,
      from: dayStart.toISOString(),
      to: dayEnd.toISOString(),
      currentScoreNorm: undefined,
    });

    const { onProjectionClick } = mockSettings.mock.calls[0][0];
    onProjectionClick({ x: hour14.getTime(), y: [] });

    expect(onPointSelect).toHaveBeenCalledWith({
      timestamp: hour14.toISOString(),
      scoreNorm: 55,
    });
  });

  it('clears the selection when the selected hourly point is clicked again', () => {
    const onPointSelect = jest.fn();
    const hour8 = new Date(2026, 0, 10, 8);
    const hour14 = new Date(2026, 0, 10, 14);
    const hourlyEntries = [
      {
        '@timestamp': hour8.toISOString(),
        calculated_score_norm: 40,
        calculated_level: 'Moderate',
      },
      {
        '@timestamp': hour14.toISOString(),
        calculated_score_norm: 55,
        calculated_level: 'Moderate',
      },
    ];
    mockUseRiskScoreHistory.mockReturnValue({
      data: { entity_id: 'user:test-id', entity_type: 'user', interval: '1h', entries: hourlyEntries },
      isLoading: false,
      error: undefined,
    });

    const dayStart = new Date(2026, 0, 10);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

    renderTimeline({
      onPointSelect,
      selectedTimestamp: hour14.toISOString(),
      from: dayStart.toISOString(),
      to: dayEnd.toISOString(),
      currentScoreNorm: undefined,
    });

    const { onProjectionClick } = mockSettings.mock.calls[0][0];
    onProjectionClick({ x: hour14.getTime(), y: [] });

    expect(onPointSelect).toHaveBeenCalledWith(undefined);
  });

  it('ignores projection clicks without an x value', () => {
    const onPointSelect = jest.fn();
    const onRangeChange = jest.fn();
    renderTimeline({ onPointSelect, onRangeChange });

    const { onProjectionClick } = mockSettings.mock.calls[0][0];
    onProjectionClick({ x: null, y: [] });

    expect(onPointSelect).not.toHaveBeenCalled();
    expect(onRangeChange).not.toHaveBeenCalled();
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

  it('shows a back control after drilling into a day', () => {
    const onRangeChange = jest.fn();
    const { getByTestId } = renderTimeline({ onRangeChange });

    const { onProjectionClick } = mockSettings.mock.calls[0][0];
    act(() => {
      onProjectionClick({ x: Date.parse('2026-01-10T00:00:00.000Z'), y: [] });
    });

    expect(onRangeChange).toHaveBeenCalled();
    expect(getByTestId('riskScoreTimeline-BackToPreviousRange')).toBeInTheDocument();
    // Picker shows the selected calendar day only (not "that day until now").
    expect(getByTestId('riskScoreTimeline-DateRangePicker').getAttribute('data-value')).toMatch(
      / to /
    );
  });

  it('renders Y-axis ticks at increments of 10 with integer labels', () => {
    renderTimeline();

    const scoreAxis = mockAxis.mock.calls.find(([props]) => props.id === 'riskScoreTimelineScore');
    expect(scoreAxis?.[0]).toEqual(
      expect.objectContaining({
        domain: { min: 0, max: 100 },
        ticks: 11,
        integersOnly: true,
      })
    );
    expect(scoreAxis?.[0].tickFormat(55)).toBe('55');
    expect(scoreAxis?.[0].tickFormat(72.4)).toBe('72');
  });

  it('renders a selection annotation when a timestamp is selected', () => {
    mockUseRiskScoreHistory.mockReturnValue({
      data: {
        entity_id: 'user:test-id',
        entity_type: 'user',
        interval: '1h',
        entries: [
          {
            '@timestamp': '2026-01-10T14:00:00.000Z',
            calculated_score_norm: 55,
            calculated_level: 'Moderate',
          },
        ],
      },
      isLoading: false,
      error: undefined,
    });

    renderTimeline({
      selectedTimestamp: '2026-01-10T14:00:00.000Z',
      from: '2026-01-10T00:00:00.000Z',
      to: '2026-01-10T23:59:59.999Z',
    });

    const annotationIds = mockLineAnnotation.mock.calls.map(([props]) => props.id);
    expect(annotationIds).toContain('riskScoreTimelineSelection');
  });

  it('does not render a selection annotation without a selection', () => {
    renderTimeline();

    const annotationIds = mockLineAnnotation.mock.calls.map(([props]) => props.id);
    expect(annotationIds).not.toContain('riskScoreTimelineSelection');
  });

  it('renders the History title and date range picker defaulting to Last 30 days', () => {
    const { getByTestId, getByText } = renderTimeline();

    expect(getByText('History')).toBeInTheDocument();
    expect(getByTestId('riskScoreTimeline-DateRangePicker')).toHaveAttribute(
      'data-value',
      'Last 30 days'
    );
  });

  it('propagates a valid range change through onChange', () => {
    const onRangeChange = jest.fn();
    const { getByTestId } = renderTimeline({ onRangeChange });

    act(() => {
      fireEvent.click(getByTestId('riskScoreTimeline-DateRangePicker'));
    });

    expect(onRangeChange).toHaveBeenCalledWith({ from: 'now-30d', to: 'now' });
  });

  it('ignores invalid range changes', () => {
    const onRangeChange = jest.fn();
    renderTimeline({ onRangeChange });

    act(() => {
      mockDateRangePickerOnChange({
        start: 'bad',
        end: 'worse',
        value: 'bad',
        isInvalid: true,
      });
    });

    expect(onRangeChange).not.toHaveBeenCalled();
  });

  it('fetches history for the given range without a page size', () => {
    renderTimeline();

    expect(mockUseRiskScoreHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: EntityType.user,
        entityId: 'user:test-id',
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-01-20T23:59:59.999Z',
      })
    );
    expect(mockUseRiskScoreHistory).not.toHaveBeenCalledWith(
      expect.objectContaining({ pageSize: expect.anything() })
    );
  });

  it('feeds a daily minInterval to the chart x-domain', () => {
    renderTimeline();

    expect(mockSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        xDomain: expect.objectContaining({ minInterval: 86_400_000 }),
      })
    );
  });

  it('feeds an hourly minInterval when the range is a single day', () => {
    mockUseRiskScoreHistory.mockReturnValue({
      data: {
        entity_id: 'user:test-id',
        entity_type: 'user',
        interval: '1h',
        entries: [
          {
            '@timestamp': '2026-01-10T12:00:00.000Z',
            calculated_score_norm: 50,
            calculated_level: 'Moderate',
          },
        ],
      },
      isLoading: false,
      error: undefined,
    });

    renderTimeline({
      from: '2026-01-10T00:00:00.000Z',
      to: '2026-01-10T23:59:59.999Z',
    });

    expect(mockSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        xDomain: expect.objectContaining({ minInterval: 3_600_000 }),
      })
    );
  });
});
