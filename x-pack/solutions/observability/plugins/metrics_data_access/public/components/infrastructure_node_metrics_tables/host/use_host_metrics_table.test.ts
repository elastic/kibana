/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  otelDatasetFilterDsl,
  SEMCONV_SYSTEM_CPU_LOGICAL_COUNT,
  SEMCONV_SYSTEM_CPU_UTILIZATION,
  SEMCONV_SYSTEM_MEMORY_TOTAL,
  SEMCONV_SYSTEM_MEMORY_UTILIZATION,
  SYSTEM_CPU_CORES,
  SYSTEM_CPU_TOTAL_NORM_PCT,
  SYSTEM_MEMORY_TOTAL,
  SYSTEM_MEMORY_USED_PCT,
} from '../shared/constants';
import { useHostMetricsTable } from './use_host_metrics_table';
import { useInfrastructureNodeMetrics } from '../shared';
import { renderHook } from '@testing-library/react';
import { createMetricsClientMock } from '../test_helpers';

jest.mock('../shared', () => ({
  ...jest.requireActual('../shared'),
  useInfrastructureNodeMetrics: jest.fn(),
}));

describe('useHostMetricsTable hook', () => {
  const useInfrastructureNodeMetricsMock = useInfrastructureNodeMetrics as jest.MockedFunction<
    typeof useInfrastructureNodeMetrics
  >;

  it('should call useInfrastructureNodeMetrics hook with event.module filter in filterClauseDsl query', () => {
    const filterClauseDsl = {
      bool: {
        should: [
          {
            terms: {
              'host.name': 'gke-edge-oblt-pool-1-9a60016d-lgg9',
            },
          },
        ],
        minimum_should_match: 1,
      },
    };

    const filterClauseWithEventModuleFilter = {
      bool: {
        filter: [{ term: { 'event.module': 'system' } }, { ...filterClauseDsl }],
      },
    };

    // include this to prevent rendering error in test
    useInfrastructureNodeMetricsMock.mockReturnValue({
      isLoading: true,
      data: { state: 'empty-indices' },
      metricIndices: 'test-index',
    });

    renderHook(() =>
      useHostMetricsTable({
        timerange: { from: 'now-30d', to: 'now' },
        filterClauseDsl,
        metricsClient: createMetricsClientMock({}),
      })
    );

    expect(useInfrastructureNodeMetricsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metricsExplorerOptions: expect.objectContaining({
          filterQuery: JSON.stringify(filterClauseWithEventModuleFilter),
        }),
      })
    );
  });

  it('should call useInfrastructureNodeMetrics with OTEL/semconv metrics when isOtel is true', () => {
    const filterClauseDsl = {
      bool: {
        filter: [{ term: { 'host.name': 'gke-edge-oblt-pool-1-9a60016d-lgg9' } }],
      },
    };

    const filterClauseWithEventModuleFilter = {
      bool: {
        filter: [otelDatasetFilterDsl('hostmetricsreceiver.otel'), { ...filterClauseDsl }],
      },
    };

    // include this to prevent rendering error in test
    useInfrastructureNodeMetricsMock.mockReturnValue({
      isLoading: true,
      data: { state: 'empty-indices' },
      metricIndices: 'test-index',
    });

    renderHook(() =>
      useHostMetricsTable({
        timerange: { from: 'now-30d', to: 'now' },
        filterClauseDsl,
        metricsClient: createMetricsClientMock({}),
        isOtel: true,
      })
    );

    expect(useInfrastructureNodeMetricsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metricsExplorerOptions: expect.objectContaining({
          filterQuery: JSON.stringify(filterClauseWithEventModuleFilter),
          metrics: expect.arrayContaining([
            expect.objectContaining({ field: SEMCONV_SYSTEM_CPU_LOGICAL_COUNT }),
            expect.objectContaining({ field: SEMCONV_SYSTEM_CPU_UTILIZATION }),
            expect.objectContaining({ field: SEMCONV_SYSTEM_MEMORY_TOTAL }),
            expect.objectContaining({ field: SEMCONV_SYSTEM_MEMORY_UTILIZATION }),
          ]),
        }),
      })
    );
  });

  it('should transform OTel rows into populated host metrics', () => {
    useInfrastructureNodeMetricsMock.mockClear();
    useInfrastructureNodeMetricsMock.mockReturnValue({
      isLoading: true,
      data: { state: 'empty-indices' },
      metricIndices: 'test-index',
    });

    renderHook(() =>
      useHostMetricsTable({
        timerange: { from: 'now-30d', to: 'now' },
        metricsClient: createMetricsClientMock({}),
        isOtel: true,
      })
    );

    const lastCallArgs = useInfrastructureNodeMetricsMock.mock.calls.at(-1);
    const { transform, metricsExplorerOptions } = lastCallArgs?.[0] ?? {};
    expect(transform).toBeDefined();

    const metrics = metricsExplorerOptions?.metrics ?? [];
    const metricIndexByField = new Map(metrics.map((metric, index) => [metric.field, index]));

    const row = transform!({
      id: 'otel-host-1',
      columns: [],
      rows: [
        {
          timestamp: Date.now(),
          [`metric_${metricIndexByField.get(SEMCONV_SYSTEM_CPU_LOGICAL_COUNT)}`]: 8,
          [`metric_${metricIndexByField.get(SEMCONV_SYSTEM_CPU_UTILIZATION)}`]: 0.42,
          [`metric_${metricIndexByField.get(SEMCONV_SYSTEM_MEMORY_TOTAL)}`]: 16_000_000_000,
          [`metric_${metricIndexByField.get(SEMCONV_SYSTEM_MEMORY_UTILIZATION)}`]: 0.25,
        },
      ],
    });

    expect(row).toEqual({
      name: 'otel-host-1',
      cpuCount: 8,
      averageCpuUsagePercent: 42,
      totalMemoryMegabytes: 16000,
      averageMemoryUsagePercent: 25,
    });
  });

  it('should return null totalMemoryMegabytes when memory total metric is absent (B=0 in equation)', () => {
    useInfrastructureNodeMetricsMock.mockClear();
    useInfrastructureNodeMetricsMock.mockReturnValue({
      isLoading: true,
      data: { state: 'empty-indices' },
      metricIndices: 'test-index',
    });

    renderHook(() =>
      useHostMetricsTable({
        timerange: { from: 'now-30d', to: 'now' },
        metricsClient: createMetricsClientMock({}),
        isOtel: true,
      })
    );

    const lastCallArgs = useInfrastructureNodeMetricsMock.mock.calls.at(-1);
    const { transform, metricsExplorerOptions } = lastCallArgs?.[0] ?? {};
    expect(transform).toBeDefined();

    const metrics = metricsExplorerOptions?.metrics ?? [];
    const metricIndexByField = new Map(metrics.map((metric, index) => [metric.field, index]));

    const row = transform!({
      id: 'otel-host-2',
      columns: [],
      rows: [
        {
          timestamp: Date.now(),
          [`metric_${metricIndexByField.get(SEMCONV_SYSTEM_CPU_LOGICAL_COUNT)}`]: 4,
          [`metric_${metricIndexByField.get(SEMCONV_SYSTEM_CPU_UTILIZATION)}`]: 0.1,
          [`metric_${metricIndexByField.get(SEMCONV_SYSTEM_MEMORY_UTILIZATION)}`]: 0.5,
        },
      ],
    });

    expect(row).toEqual({
      name: 'otel-host-2',
      cpuCount: 4,
      averageCpuUsagePercent: 10,
      totalMemoryMegabytes: null,
      averageMemoryUsagePercent: 50,
    });
  });

  it('should call useInfrastructureNodeMetrics with ECS metrics when isOtel is false', () => {
    const filterClauseDsl = {
      bool: {
        filter: [{ term: { 'host.name': 'gke-edge-oblt-pool-1-9a60016d-lgg9' } }],
      },
    };

    const filterClauseWithEventModuleFilter = {
      bool: {
        filter: [{ term: { 'event.module': 'system' } }, { ...filterClauseDsl }],
      },
    };

    // include this to prevent rendering error in test
    useInfrastructureNodeMetricsMock.mockReturnValue({
      isLoading: true,
      data: { state: 'empty-indices' },
      metricIndices: 'test-index',
    });

    renderHook(() =>
      useHostMetricsTable({
        timerange: { from: 'now-30d', to: 'now' },
        filterClauseDsl,
        metricsClient: createMetricsClientMock({}),
        isOtel: false,
      })
    );

    expect(useInfrastructureNodeMetricsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metricsExplorerOptions: expect.objectContaining({
          filterQuery: JSON.stringify(filterClauseWithEventModuleFilter),
          metrics: expect.arrayContaining([
            expect.objectContaining({ field: SYSTEM_CPU_CORES }),
            expect.objectContaining({ field: SYSTEM_CPU_TOTAL_NORM_PCT }),
            expect.objectContaining({ field: SYSTEM_MEMORY_TOTAL }),
            expect.objectContaining({ field: SYSTEM_MEMORY_USED_PCT }),
          ]),
        }),
      })
    );
  });
});
