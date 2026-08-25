/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AppDataType } from '../types';
import { trackTelemetryOnApply, trackTelemetryOnLoad } from './telemetry';

const mockMultipleSeries = [
  {
    name: 'performance-distribution',
    dataType: 'ux' as AppDataType,
    breakdown: 'user_agent.name',
    time: { from: 'now-15m', to: 'now' },
    filters: [
      {
        field: 'url.full',
        value: 'https://elastic.co',
      },
    ],
    selectedMetricField: 'transaction.duration.us',
  },
  {
    name: 'kpi-over-time',
    dataType: 'synthetics' as AppDataType,
    breakdown: 'user_agent.name',
    time: { from: 'now-15m', to: 'now' },
    filters: [
      {
        field: 'monitor.type',
        value: 'browser',
      },
    ],
    selectedMetricField: 'monitor.duration.us',
  },
];

describe('telemetry', function () {
  it('ensures that appropriate telemetry is called when settings are applied', () => {
    const trackEvent = jest.fn();
    trackTelemetryOnApply(trackEvent, mockMultipleSeries, 'kpi-over-time');

    expect(trackEvent).toBeCalledTimes(7);
    expect(trackEvent).toBeCalledWith({
      app: 'observability-overview',
      metric: 'exploratory_view__filters__filter_url.full',
      metricType: 'count',
    });
    expect(trackEvent).toBeCalledWith({
      app: 'observability-overview',
      metric: 'exploratory_view__filters__filter_monitor.type',
      metricType: 'count',
    });
    expect(trackEvent).toBeCalledWith({
      app: 'observability-overview',
      metric: 'exploratory_view__filters__report_type_kpi-over-time__data_type_ux__filter_url.full',
      metricType: 'count',
    });
    expect(trackEvent).toBeCalledWith({
      app: 'observability-overview',
      metric:
        'exploratory_view__filters__report_type_kpi-over-time__data_type_synthetics__filter_monitor.type',
      metricType: 'count',
    });
    expect(trackEvent).toBeCalledWith({
      app: 'observability-overview',
      metric:
        'exploratory_view__report_type_kpi-over-time__data_type_synthetics__metric_type_monitor.duration.us',
      metricType: 'count',
    });
    expect(trackEvent).toBeCalledWith({
      app: 'observability-overview',
      metric:
        'exploratory_view__report_type_kpi-over-time__data_type_ux__metric_type_transaction.duration.us',
      metricType: 'count',
    });
    expect(trackEvent).toBeCalledWith({
      app: 'observability-overview',
      metric: 'exploratory_view_apply_changes',
      metricType: 'count',
    });
  });

  it('does not call track event for report type/data type/metric type config unless all values are truthy', () => {
    const trackEvent = jest.fn();
    const series = {
      ...mockMultipleSeries[1],
      filters: undefined,
      selectedMetricField: undefined,
    };

    trackTelemetryOnApply(trackEvent, [series], 'kpi-over-time');

    expect(trackEvent).toBeCalledTimes(1);
    expect(trackEvent).toBeCalledWith({
      app: 'observability-overview',
      metric: 'exploratory_view_apply_changes',
      metricType: 'count',
    });
  });

  it.each([
    [1635784025000, '5-10'],
    [1635784030000, '10-20'],
    [1635784040000, '20-30'],
    [1635784050000, '30-60'],
    [1635784080000, '60+'],
  ])('ensures that appropriate telemetry is called when chart is loaded', (endTime, range) => {
    const trackEvent = jest.fn();
    trackTelemetryOnLoad(trackEvent, 1635784020000, endTime);

    expect(trackEvent).toBeCalledTimes(1);
    expect(trackEvent).toBeCalledWith({
      app: 'observability-overview',
      metric: `exploratory_view__chart_loading_in_seconds_${range}`,
      metricType: 'count',
    });
  });
});
