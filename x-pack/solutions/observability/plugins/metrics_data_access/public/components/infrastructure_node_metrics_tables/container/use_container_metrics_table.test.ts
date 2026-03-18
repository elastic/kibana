/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ECS_CONTAINER_CPU_USAGE_LIMIT_PCT,
  ECS_CONTAINER_MEMORY_USAGE_BYTES,
  SEMCONV_DOCKER_CONTAINER_CPU_UTILIZATION,
  SEMCONV_DOCKER_CONTAINER_MEMORY_PERCENT,
  SEMCONV_K8S_CONTAINER_CPU_LIMIT_UTILIZATION,
  SEMCONV_K8S_CONTAINER_MEMORY_LIMIT_UTILIZATION,
} from '../shared/constants';
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
      metricIndices: 'test-index',
    });

    renderHook(() =>
      useContainerMetricsTable({
        timerange: { from: 'now-30d', to: 'now' },
        kuery,
        metricsClient: createMetricsClientMock({}),
      })
    );

    const kueryWithEventModuleFilter = `event.dataset: "kubernetes.container" AND (${kuery})`;

    expect(useInfrastructureNodeMetricsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metricsExplorerOptions: expect.objectContaining({
          kuery: kueryWithEventModuleFilter,
        }),
      })
    );
  });

  it('should call useInfrastructureNodeMetrics with SemConv Docker metrics when isOtel is true (default)', () => {
    const kuery = 'container.id: "gke-edge-oblt-pool-1-9a60016d-lgg9"';

    useInfrastructureNodeMetricsMock.mockReturnValue({
      isLoading: true,
      data: { state: 'empty-indices' },
      metricIndices: 'test-index',
    });

    renderHook(() =>
      useContainerMetricsTable({
        timerange: { from: 'now-30d', to: 'now' },
        kuery,
        metricsClient: createMetricsClientMock({}),
        isOtel: true,
      })
    );

    expect(useInfrastructureNodeMetricsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metricsExplorerOptions: expect.objectContaining({
          kuery: `event.dataset: "dockerstatsreceiver.otel" AND (${kuery})`,
          metrics: expect.arrayContaining([
            expect.objectContaining({ field: SEMCONV_DOCKER_CONTAINER_CPU_UTILIZATION }),
            expect.objectContaining({ field: SEMCONV_DOCKER_CONTAINER_MEMORY_PERCENT }),
          ]),
        }),
      })
    );
  });

  it('should call useInfrastructureNodeMetrics with SemConv K8s metrics when isOtel is true and isK8s is true', () => {
    const kuery = 'container.id: "some-k8s-container"';

    useInfrastructureNodeMetricsMock.mockReturnValue({
      isLoading: true,
      data: { state: 'empty-indices' },
      metricIndices: 'test-index',
    });

    renderHook(() =>
      useContainerMetricsTable({
        timerange: { from: 'now-30d', to: 'now' },
        kuery,
        metricsClient: createMetricsClientMock({}),
        isOtel: true,
        isK8sContainer: true,
      })
    );

    expect(useInfrastructureNodeMetricsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metricsExplorerOptions: expect.objectContaining({
          kuery: `event.dataset: "kubeletstatsreceiver.otel" AND (${kuery})`,
          metrics: expect.arrayContaining([
            expect.objectContaining({
              field: SEMCONV_K8S_CONTAINER_CPU_LIMIT_UTILIZATION,
            }),
            expect.objectContaining({
              field: SEMCONV_K8S_CONTAINER_MEMORY_LIMIT_UTILIZATION,
            }),
          ]),
        }),
      })
    );
  });

  it('should call useInfrastructureNodeMetrics with ECS metrics when isOtel is false', () => {
    const kuery = 'container.id: "gke-edge-oblt-pool-1-9a60016d-lgg9"';

    useInfrastructureNodeMetricsMock.mockReturnValue({
      isLoading: true,
      data: { state: 'empty-indices' },
      metricIndices: 'test-index',
    });

    renderHook(() =>
      useContainerMetricsTable({
        timerange: { from: 'now-30d', to: 'now' },
        kuery,
        metricsClient: createMetricsClientMock({}),
        isOtel: false,
      })
    );

    const kueryWithEventDatasetFilter = `event.dataset: "kubernetes.container" AND (${kuery})`;

    expect(useInfrastructureNodeMetricsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metricsExplorerOptions: expect.objectContaining({
          kuery: kueryWithEventDatasetFilter,
          metrics: expect.arrayContaining([
            expect.objectContaining({
              field: ECS_CONTAINER_CPU_USAGE_LIMIT_PCT,
            }),
            expect.objectContaining({
              field: ECS_CONTAINER_MEMORY_USAGE_BYTES,
            }),
          ]),
        }),
      })
    );
  });
});
