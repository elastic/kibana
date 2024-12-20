/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import {
  useMetricsExplorerOptions,
  MetricsExplorerOptions,
  MetricsExplorerTimeOptions,
  DEFAULT_OPTIONS,
  DEFAULT_TIMERANGE,
} from './use_metrics_explorer_options';

let PREFILL: Record<string, any> = {};
jest.mock('../../../../alerting/use_alert_prefill', () => ({
  useAlertPrefillContext: () => ({
    metricThresholdPrefill: {
      setPrefillOptions(opts: Record<string, any>) {
        PREFILL = opts;
      },
    },
  }),
}));

jest.mock('../../../../hooks/use_kibana_timefilter_time', () => ({
  useKibanaTimefilterTime: (defaults: { from: string; to: string }) => [() => defaults],
  useSyncKibanaTimeFilterTime: () => [() => {}],
}));

const renderUseMetricsExplorerOptionsHook = () => renderHook(() => useMetricsExplorerOptions());

interface LocalStore {
  [key: string]: string;
}

interface LocalStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

const STORE: LocalStore = {};
const localStorageMock: LocalStorage = {
  getItem: (key: string) => {
    return STORE[key] || null;
  },
  setItem: (key: string, value: any) => {
    STORE[key] = value.toString();
  },
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useMetricExplorerOptions', () => {
  beforeEach(() => {
    delete STORE.MetricsExplorerOptions;
    delete STORE.MetricsExplorerTimeRange;
    PREFILL = {};
  });

  it('should just work', () => {
    const { result } = renderUseMetricsExplorerOptionsHook();
    expect(result.current.options).toEqual(DEFAULT_OPTIONS);
    expect(result.current.timeRange).toEqual(DEFAULT_TIMERANGE);
    expect(result.current.isAutoReloading).toEqual(false);
    expect(STORE.MetricsExplorerOptions).toEqual(JSON.stringify(DEFAULT_OPTIONS));
  });

  it('should change the store when options update', () => {
    const { result, rerender } = renderUseMetricsExplorerOptionsHook();
    const newOptions: MetricsExplorerOptions = {
      ...DEFAULT_OPTIONS,
      metrics: [{ aggregation: 'count' }],
    };
    act(() => {
      result.current.setOptions(newOptions);
    });
    rerender();
    expect(result.current.options).toEqual(newOptions);
    expect(STORE.MetricsExplorerOptions).toEqual(JSON.stringify(newOptions));
  });

  it('should change the store when timerange update', () => {
    const { result, rerender } = renderUseMetricsExplorerOptionsHook();
    const newTimeRange: MetricsExplorerTimeOptions = {
      ...DEFAULT_TIMERANGE,
      from: 'now-15m',
    };
    act(() => {
      result.current.setTimeRange(newTimeRange);
    });
    rerender();
    expect(result.current.timeRange).toEqual(newTimeRange);
  });

  it('should load from store when available', () => {
    const newOptions: MetricsExplorerOptions = {
      ...DEFAULT_OPTIONS,
      metrics: [{ aggregation: 'avg', field: 'system.load.1' }],
    };
    STORE.MetricsExplorerOptions = JSON.stringify(newOptions);
    const { result } = renderUseMetricsExplorerOptionsHook();
    expect(result.current.options).toEqual(newOptions);
  });

  it('should sync the options to the threshold alert preview context', () => {
    const { result, rerender } = renderUseMetricsExplorerOptionsHook();

    const newOptions: MetricsExplorerOptions = {
      ...DEFAULT_OPTIONS,
      metrics: [{ aggregation: 'count' }],
      filterQuery: 'foo',
      groupBy: 'host.hostname',
    };
    act(() => {
      result.current.setOptions(newOptions);
    });
    rerender();
    expect(PREFILL.metrics).toEqual(newOptions.metrics);
    expect(PREFILL.groupBy).toEqual(newOptions.groupBy);
    expect(PREFILL.filterQuery).toEqual(newOptions.filterQuery);
  });
});
