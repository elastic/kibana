/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SEMCONV_SYSTEM_CPU_LOGICAL_COUNT,
  SEMCONV_SYSTEM_CPU_UTILIZATION,
  SEMCONV_SYSTEM_MEMORY_LIMIT,
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

  it('should call useInfrastructureNodeMetrics hook with event.module filter in kuery', () => {
    const kuery = `host.name: "gke-edge-oblt-pool-1-9a60016d-lgg9"`;

    // include this to prevent rendering error in test
    useInfrastructureNodeMetricsMock.mockReturnValue({
      isLoading: true,
      data: { state: 'empty-indices' },
      metricIndices: 'test-index',
    });

    renderHook(() =>
      useHostMetricsTable({
        timerange: { from: 'now-30d', to: 'now' },
        kuery,
        metricsClient: createMetricsClientMock({}),
      })
    );

    const kueryWithEventModuleFilter = `event.module: "system" AND (${kuery})`;

    expect(useInfrastructureNodeMetricsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metricsExplorerOptions: expect.objectContaining({
          kuery: kueryWithEventModuleFilter,
        }),
      })
    );
  });

  it('should call useInfrastructureNodeMetrics with OTEL/semconv metrics when isOtel is true', () => {
    const kuery = `host.name: "gke-edge-oblt-pool-1-9a60016d-lgg9"`;

    // include this to prevent rendering error in test
    useInfrastructureNodeMetricsMock.mockReturnValue({
      isLoading: true,
      data: { state: 'empty-indices' },
      metricIndices: 'test-index',
    });

    renderHook(() =>
      useHostMetricsTable({
        timerange: { from: 'now-30d', to: 'now' },
        kuery,
        metricsClient: createMetricsClientMock({}),
        isOtel: true,
      })
    );

    expect(useInfrastructureNodeMetricsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metricsExplorerOptions: expect.objectContaining({
          kuery: `event.dataset: "hostmetricsreceiver.otel" AND (${kuery})`,
          metrics: expect.arrayContaining([
            expect.objectContaining({ field: SEMCONV_SYSTEM_CPU_LOGICAL_COUNT }),
            expect.objectContaining({ field: SEMCONV_SYSTEM_CPU_UTILIZATION }),
            expect.objectContaining({ field: SEMCONV_SYSTEM_MEMORY_LIMIT }),
            expect.objectContaining({ field: SEMCONV_SYSTEM_MEMORY_UTILIZATION }),
          ]),
        }),
      })
    );
  });

  it('should call useInfrastructureNodeMetrics with ECS metrics when isOtel is false', () => {
    const kuery = `host.name: "gke-edge-oblt-pool-1-9a60016d-lgg9"`;

    // include this to prevent rendering error in test
    useInfrastructureNodeMetricsMock.mockReturnValue({
      isLoading: true,
      data: { state: 'empty-indices' },
      metricIndices: 'test-index',
    });

    renderHook(() =>
      useHostMetricsTable({
        timerange: { from: 'now-30d', to: 'now' },
        kuery,
        metricsClient: createMetricsClientMock({}),
        isOtel: false,
      })
    );

    const kueryWithEventModuleFilter = `event.module: "system" AND (${kuery})`;

    expect(useInfrastructureNodeMetricsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metricsExplorerOptions: expect.objectContaining({
          kuery: kueryWithEventModuleFilter,
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
