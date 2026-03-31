/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ECS_POD_CPU_USAGE_LIMIT_PCT,
  MEMORY_LIMIT_UTILIZATION,
  SEMCONV_K8S_POD_CPU_LIMIT_UTILIZATION,
} from '../shared/constants';
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

  it('should call useInfrastructureNodeMetrics hook with event.module filter in filterClauseDsl query', () => {
    const filterClauseDsl = {
      bool: {
        filter: [{ term: { 'container.id': 'gke-edge-oblt-pool-1-9a60016d-lgg9' } }],
      },
    };

    const filterClauseWithEventModuleFilter = {
      bool: {
        filter: [{ term: { 'event.dataset': 'kubernetes.pod' } }, { ...filterClauseDsl }],
      },
    };

    // include this to prevent rendering error in test
    useInfrastructureNodeMetricsMock.mockReturnValue({
      isLoading: true,
      data: { state: 'empty-indices' },
      metricIndices: 'test-index',
    });

    renderHook(() =>
      usePodMetricsTable({
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
        filter: [{ term: { 'container.id': 'gke-edge-oblt-pool-1-9a60016d-lgg9' } }],
      },
    };

    const filterClauseWithEventModuleFilter = {
      bool: {
        filter: [
          { term: { 'event.dataset': 'kubeletstatsreceiver.otel' } },
          { ...filterClauseDsl },
        ],
      },
    };

    // include this to prevent rendering error in test
    useInfrastructureNodeMetricsMock.mockReturnValue({
      isLoading: true,
      data: { state: 'empty-indices' },
      metricIndices: 'test-index',
    });

    renderHook(() =>
      usePodMetricsTable({
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
            expect.objectContaining({ field: SEMCONV_K8S_POD_CPU_LIMIT_UTILIZATION }),
            expect.objectContaining({ field: MEMORY_LIMIT_UTILIZATION }),
          ]),
        }),
      })
    );
  });

  it('should call useInfrastructureNodeMetrics with ECS metrics when isOtel is false', () => {
    const filterClauseDsl = {
      bool: {
        filter: [{ term: { 'container.id': 'gke-edge-oblt-pool-1-9a60016d-lgg9' } }],
      },
    };

    const filterClauseWithEventModuleFilter = {
      bool: {
        filter: [{ term: { 'event.dataset': 'kubernetes.pod' } }, { ...filterClauseDsl }],
      },
    };

    // include this to prevent rendering error in test
    useInfrastructureNodeMetricsMock.mockReturnValue({
      isLoading: true,
      data: { state: 'empty-indices' },
      metricIndices: 'test-index',
    });

    renderHook(() =>
      usePodMetricsTable({
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
            expect.objectContaining({ field: ECS_POD_CPU_USAGE_LIMIT_PCT }),
            expect.objectContaining({ field: MEMORY_LIMIT_UTILIZATION }),
          ]),
        }),
      })
    );
  });
});
