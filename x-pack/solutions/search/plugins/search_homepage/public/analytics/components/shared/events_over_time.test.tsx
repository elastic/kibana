/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiThemeProvider } from '@elastic/eui';
import { render, screen, waitFor } from '@testing-library/react';
import type { AnalyticsEventsOverTime } from '../../../../common/analytics';
import { useEventsOverTime } from '../../hooks/use_events_over_time';
import type { EventsOverTimeResult } from '../../hooks/use_events_over_time';
import type { AnalyticsEventSource } from '../../types';
import { EventsOverTime } from './events_over_time';
import type { EventsOverTimeChartProps } from './events_over_time_chart';
import { EVENT_SOURCE, SAMPLE_EVENT_SOURCE } from './test_helpers';

jest.mock('../../hooks/use_events_over_time');
jest.mock('./events_over_time_chart', () => ({
  EventsOverTimeChart: ({ data, titleId, description }: EventsOverTimeChartProps) => {
    if (data.total < 0) {
      throw new Error('chart failed');
    }
    return (
      <div data-test-subj="eventsOverTimeChartStub" aria-labelledby={titleId}>
        {description}
      </div>
    );
  },
}));

const mockUseEventsOverTime = jest.mocked(useEventsOverTime);

const HOUR_MS = 3_600_000;
const FROM = Date.UTC(2026, 0, 1);
const EVENTS: AnalyticsEventsOverTime = {
  from: FROM,
  to: FROM + 3 * HOUR_MS,
  intervalMs: HOUR_MS,
  total: 1_600,
  buckets: [
    { timestamp: FROM, count: 100 },
    { timestamp: FROM + HOUR_MS, count: 1_200 },
    { timestamp: FROM + 2 * HOUR_MS, count: 300 },
  ],
};
const NO_TIME_SOURCE: AnalyticsEventSource = { ...EVENT_SOURCE, name: 'orders', timeField: null };

describe('EventsOverTime', () => {
  const reportFailure = jest.fn();

  const setup = ({
    sources = [EVENT_SOURCE],
    totalSources = sources.length,
    result = {},
  }: {
    sources?: AnalyticsEventSource[];
    totalSources?: number;
    result?: Partial<EventsOverTimeResult>;
  } = {}) => {
    mockUseEventsOverTime.mockReturnValue({
      data: EVENTS,
      isLoading: false,
      hasFailed: false,
      reportFailure,
      ...result,
    });
    return render(
      <EuiThemeProvider>
        <EventsOverTime
          page="home"
          headingElement="h2"
          sources={sources}
          totalSources={totalSources}
        />
      </EuiThemeProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('charts the sources that have a time field, with a title, a range and a text alternative', async () => {
    setup({ sources: [EVENT_SOURCE, NO_TIME_SOURCE, SAMPLE_EVENT_SOURCE], totalSources: 3 });

    expect(mockUseEventsOverTime).toHaveBeenCalledWith([
      { name: 'clickstream-events', timeField: '@timestamp' },
      { name: 'kibana_sample_data_logs', timeField: 'timestamp' },
    ]);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'Events over time in 2 of 3 sources'
    );
    expect(screen.getByTestId('analyticsHomeEventsOverTimeRange')).toHaveTextContent(
      '1.6K events in the last 3 hours'
    );
    const chart = await screen.findByTestId('eventsOverTimeChartStub');
    expect(chart).toHaveTextContent('1.6K events in total');
    expect(chart).toHaveTextContent('with 1.2K events');
    expect(chart).toHaveAttribute('aria-labelledby', screen.getByRole('heading').id);
  });

  it('names the source when it is one of several, and nothing when it covers them all', () => {
    const { unmount } = setup({ totalSources: 4 });
    expect(screen.getByRole('heading')).toHaveTextContent('Events over time in clickstream-events');
    unmount();

    setup();
    expect(screen.getByRole('heading')).toHaveTextContent(/^Events over time$/);
  });

  it('holds the place of the chart while the counts load', () => {
    setup({ result: { data: undefined, isLoading: true } });

    expect(screen.getByTestId('analyticsHomeEventsOverTime')).toBeInTheDocument();
    expect(screen.getByTestId('analyticsHomeEventsOverTimeLoading')).toBeInTheDocument();
    expect(screen.queryByTestId('analyticsHomeEventsOverTimeRange')).not.toBeInTheDocument();
  });

  it.each<[string, AnalyticsEventSource[], Partial<EventsOverTimeResult>]>([
    ['no source has a time field', [NO_TIME_SOURCE], { data: undefined }],
    ['there are no sources', [], { data: undefined }],
    ['the counts cannot be loaded', [EVENT_SOURCE], { data: undefined, hasFailed: true }],
    ['there are no recent events', [EVENT_SOURCE], { data: { ...EVENTS, total: 0, buckets: [] } }],
  ])('renders nothing when %s', (_, sources, result) => {
    const { container } = setup({ sources, result });

    expect(container).toBeEmptyDOMElement();
  });

  it('collapses and reports when the chart fails to render', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = setup({ result: { data: { ...EVENTS, total: -1 } } });

    await waitFor(() => expect(reportFailure).toHaveBeenCalledWith('render'));
    expect(container).toBeEmptyDOMElement();
    consoleError.mockRestore();
  });
});
