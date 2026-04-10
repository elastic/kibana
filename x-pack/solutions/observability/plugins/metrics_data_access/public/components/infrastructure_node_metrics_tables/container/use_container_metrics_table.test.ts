/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ECS_CONTAINER_CPU_USAGE_LIMIT_PCT,
  ECS_CONTAINER_MEMORY_USAGE_BYTES,
  otelDatasetFilterDsl,
  SEMCONV_DOCKER_CONTAINER_CPU_UTILIZATION,
  SEMCONV_DOCKER_CONTAINER_MEMORY_PERCENT,
  SEMCONV_CONTAINER_CPU_USAGE,
  SEMCONV_CONTAINER_MEMORY_WORKING_SET,
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

  it('should call useInfrastructureNodeMetrics hook with event.module filter in filterClauseDsl query', () => {
    const filterClauseDsl = {
      bool: {
        filter: [{ term: { 'container.id': 'gke-edge-oblt-pool-1-9a60016d-lgg9' } }],
      },
    };

    const filterClauseWithEventModuleFilter = {
      bool: {
        filter: [{ term: { 'event.dataset': 'kubernetes.container' } }, { ...filterClauseDsl }],
      },
    };

    // include this to prevent rendering error in test
    useInfrastructureNodeMetricsMock.mockReturnValue({
      isLoading: true,
      data: { state: 'empty-indices' },
      metricIndices: 'test-index',
    });

    renderHook(() =>
      useContainerMetricsTable({
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

  it('should call useInfrastructureNodeMetrics with SemConv Docker metrics when isOtel is true (default)', () => {
    const filterClauseDsl = {
      bool: {
        filter: [{ term: { 'container.id': 'gke-edge-oblt-pool-1-9a60016d-lgg9' } }],
      },
    };

    const filterClauseWithEventModuleFilter = {
      bool: {
        filter: [otelDatasetFilterDsl('dockerstatsreceiver.otel'), { ...filterClauseDsl }],
      },
    };
    useInfrastructureNodeMetricsMock.mockReturnValue({
      isLoading: true,
      data: { state: 'empty-indices' },
      metricIndices: 'test-index',
    });

    renderHook(() =>
      useContainerMetricsTable({
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
            expect.objectContaining({ field: SEMCONV_DOCKER_CONTAINER_CPU_UTILIZATION }),
            expect.objectContaining({ field: SEMCONV_DOCKER_CONTAINER_MEMORY_PERCENT }),
          ]),
        }),
      })
    );
  });

  it('should call useInfrastructureNodeMetrics with SemConv K8s metrics when isOtel is true and isK8s is true', () => {
    useInfrastructureNodeMetricsMock.mockReturnValue({
      isLoading: true,
      data: { state: 'empty-indices' },
      metricIndices: 'test-index',
    });

    const filterClauseDsl = {
      bool: {
        filter: [{ term: { 'container.id': 'gke-edge-oblt-pool-1-9a60016d-lgg9' } }],
      },
    };

    const filterClauseWithEventModuleFilter = {
      bool: {
        filter: [otelDatasetFilterDsl('kubeletstatsreceiver.otel'), { ...filterClauseDsl }],
      },
    };

    renderHook(() =>
      useContainerMetricsTable({
        timerange: { from: 'now-30d', to: 'now' },
        filterClauseDsl,
        metricsClient: createMetricsClientMock({}),
        isOtel: true,
        isK8sContainer: true,
      })
    );

    expect(useInfrastructureNodeMetricsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metricsExplorerOptions: expect.objectContaining({
          filterQuery: JSON.stringify(filterClauseWithEventModuleFilter),
          metrics: expect.arrayContaining([
            expect.objectContaining({
              field: SEMCONV_CONTAINER_CPU_USAGE,
            }),
            expect.objectContaining({
              field: SEMCONV_CONTAINER_MEMORY_WORKING_SET,
            }),
          ]),
        }),
      })
    );
  });

  it('should call useInfrastructureNodeMetrics with ECS metrics when isOtel is false', () => {
    useInfrastructureNodeMetricsMock.mockReturnValue({
      isLoading: true,
      data: { state: 'empty-indices' },
      metricIndices: 'test-index',
    });

    const filterClauseDsl = {
      bool: {
        filter: [{ term: { 'container.id': 'gke-edge-oblt-pool-1-9a60016d-lgg9' } }],
      },
    };

    const filterClauseWithEventModuleFilter = {
      bool: {
        filter: [{ term: { 'event.dataset': 'kubernetes.container' } }, { ...filterClauseDsl }],
      },
    };

    renderHook(() =>
      useContainerMetricsTable({
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
