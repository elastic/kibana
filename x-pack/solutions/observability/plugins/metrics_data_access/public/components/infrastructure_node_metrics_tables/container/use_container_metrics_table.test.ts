/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContainerMetricsTable } from './use_container_metrics_table';
import { useInfrastructureNodeMetrics } from '../shared';
import { renderHook } from '@testing-library/react';
import { createMetricsClientMock } from '../test_helpers';

jest.mock('../shared', () => ({
  ...jest.requireActual('../shared'),
  useInfrastructureNodeMetrics: jest.fn(),
}));

describe('useContainerMetricsTable hook', () => {
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
      useContainerMetricsTable({
        timerange: { from: 'now-30d', to: 'now' },
        kuery,
        metricsClient: createMetricsClientMock({}),
      })
    );

    const kueryWithEventModuleFilter = `event.dataset: "kubernetes.container" AND ${kuery}`;

    expect(useInfrastructureNodeMetricsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metricsExplorerOptions: expect.objectContaining({
          kuery: kueryWithEventModuleFilter,
        }),
      })
    );
  });

  it('should call useInfrastructureNodeMetrics with SemConv Docker metrics when schema is semconv (default)', () => {
    const kuery = 'container.id: "gke-edge-oblt-pool-1-9a60016d-lgg9"';

    useInfrastructureNodeMetricsMock.mockReturnValue({
      isLoading: true,
      data: { state: 'empty-indices' },
    });

    renderHook(() =>
      useContainerMetricsTable({
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
            expect.objectContaining({ field: 'metrics.container.cpu.utilization' }),
            expect.objectContaining({ field: 'metrics.container.memory.usage.total' }),
          ]),
        }),
      })
    );
  });

  it('should call useInfrastructureNodeMetrics with SemConv K8s metrics when schema is semconv and semconvRuntime is k8s', () => {
    const kuery = 'container.id: "some-k8s-container"';

    useInfrastructureNodeMetricsMock.mockReturnValue({
      isLoading: true,
      data: { state: 'empty-indices' },
    });

    renderHook(() =>
      useContainerMetricsTable({
        timerange: { from: 'now-30d', to: 'now' },
        kuery,
        metricsClient: createMetricsClientMock({}),
        schema: 'semconv',
        semconvRuntime: 'k8s',
      })
    );

    expect(useInfrastructureNodeMetricsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metricsExplorerOptions: expect.objectContaining({
          kuery,
          metrics: expect.arrayContaining([
            expect.objectContaining({
              field: 'metrics.k8s.container.cpu_limit_utilization',
            }),
            expect.objectContaining({
              field: 'metrics.k8s.container.memory_limit_utilization',
            }),
          ]),
        }),
      })
    );
  });

  it('should call useInfrastructureNodeMetrics with ECS metrics when schema is ecs', () => {
    const kuery = 'container.id: "gke-edge-oblt-pool-1-9a60016d-lgg9"';

    useInfrastructureNodeMetricsMock.mockReturnValue({
      isLoading: true,
      data: { state: 'empty-indices' },
    });

    renderHook(() =>
      useContainerMetricsTable({
        timerange: { from: 'now-30d', to: 'now' },
        kuery,
        metricsClient: createMetricsClientMock({}),
        schema: 'ecs',
      })
    );

    const kueryWithEventModuleFilter = `event.dataset: "kubernetes.container" AND ${kuery}`;

    expect(useInfrastructureNodeMetricsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metricsExplorerOptions: expect.objectContaining({
          kuery: kueryWithEventModuleFilter,
          metrics: expect.arrayContaining([
            expect.objectContaining({
              field: 'kubernetes.container.cpu.usage.limit.pct',
            }),
            expect.objectContaining({
              field: 'kubernetes.container.memory.usage.bytes',
            }),
          ]),
        }),
      })
    );
  });
});
