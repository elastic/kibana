/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { usePodMetricsTable } from './use_pod_metrics_table';
import { useInfrastructureNodeMetrics } from '../shared';
import { renderHook } from '@testing-library/react';
import { createMetricsClientMock } from '../test_helpers';

jest.mock('../shared', () => ({
  ...jest.requireActual('../shared'),
  useInfrastructureNodeMetrics: jest.fn(),
}));

describe('usePodMetricsTable hook', () => {
  const useInfrastructureNodeMetricsMock = useInfrastructureNodeMetrics as jest.MockedFunction<
    typeof useInfrastructureNodeMetrics
  >;

  it('should call useInfrastructureNodeMetrics hook with event.module filter in kuery', () => {
    const kuery = 'container.id: "gke-edge-oblt-pool-1-9a60016d-lgg9"';

    // include this to prevent rendering error in test
    useInfrastructureNodeMetricsMock.mockReturnValue({
      isLoading: true,
      data: { state: 'empty-indices' },
    });

    renderHook(() =>
      usePodMetricsTable({
        timerange: { from: 'now-30d', to: 'now' },
        kuery,
        metricsClient: createMetricsClientMock({}),
      })
    );

    const kueryWithEventModuleFilter = `event.dataset: "kubernetes.pod" AND ${kuery}`;

    expect(useInfrastructureNodeMetricsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metricsExplorerOptions: expect.objectContaining({
          kuery: kueryWithEventModuleFilter,
        }),
      })
    );
  });

  it('should call useInfrastructureNodeMetrics with OTEL/semconv metrics when schema is semconv', () => {
    const kuery = 'container.id: "gke-edge-oblt-pool-1-9a60016d-lgg9"';

    // include this to prevent rendering error in test
    useInfrastructureNodeMetricsMock.mockReturnValue({
      isLoading: true,
      data: { state: 'empty-indices' },
    });

    renderHook(() =>
      usePodMetricsTable({
        timerange: { from: 'now-30d', to: 'now' },
        kuery,
        metricsClient: createMetricsClientMock({}),
        schema: 'semconv',
      })
    );

    expect(useInfrastructureNodeMetricsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metricsExplorerOptions: expect.objectContaining({
          kuery,
          metrics: expect.arrayContaining([
            expect.objectContaining({ field: 'metrics.k8s.pod.cpu_limit_utilization' }),
            expect.objectContaining({ field: 'memory_limit_utilization' }),
          ]),
        }),
      })
    );
  });

  it('should call useInfrastructureNodeMetrics with ECS metrics when schema is ecs', () => {
    const kuery = 'container.id: "gke-edge-oblt-pool-1-9a60016d-lgg9"';

    // include this to prevent rendering error in test
    useInfrastructureNodeMetricsMock.mockReturnValue({
      isLoading: true,
      data: { state: 'empty-indices' },
    });

    renderHook(() =>
      usePodMetricsTable({
        timerange: { from: 'now-30d', to: 'now' },
        kuery,
        metricsClient: createMetricsClientMock({}),
        schema: 'ecs',
      })
    );

    const kueryWithEventDatasetFilter = `event.dataset: "kubernetes.pod" AND ${kuery}`;

    expect(useInfrastructureNodeMetricsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metricsExplorerOptions: expect.objectContaining({
          kuery: kueryWithEventDatasetFilter,
          metrics: expect.arrayContaining([
            expect.objectContaining({ field: 'kubernetes.pod.cpu.usage.limit.pct' }),
            expect.objectContaining({ field: 'memory_limit_utilization' }),
          ]),
        }),
      })
    );
  });
});
