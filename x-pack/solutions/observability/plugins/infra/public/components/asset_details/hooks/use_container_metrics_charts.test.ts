/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor, renderHook } from '@testing-library/react';
import type { ContainerMetricTypes } from '../charts/types';
import {
  useK8sContainerPageViewMetricsCharts,
  useDockerContainerPageViewMetricsCharts,
  useDockerContainerKpiCharts,
  useK8sContainerKpiCharts,
  getSubtitleFromFormula,
} from './use_container_metrics_charts';

const metricsDataViewId = 'metricsDataViewId';
const getContainerChartsExpectedOrder = (metric: ContainerMetricTypes): string[] => {
  switch (metric) {
    case 'cpu':
      return ['cpuUsage'];
    case 'memory':
      return ['memoryUsage'];
    case 'network':
      return ['networkRxTx'];
    case 'disk':
      return ['diskIOReadWrite'];
    default:
      return [];
  }
};

const getK8sContainerChartsExpectedOrder = (metric: ContainerMetricTypes): string[] => {
  switch (metric) {
    case 'cpu':
      return ['k8sCpuUsage'];
    case 'memory':
      return ['k8sMemoryUsage'];
    default:
      return [];
  }
};

describe('useDockerContainerCharts', () => {
  describe.each<[ContainerMetricTypes]>([['cpu'], ['memory']])('%s', (item) => {
    test.each<[ContainerMetricTypes]>([[item]])(
      'should return an array of charts with correct order for metric "%s"',
      async (metric) => {
        const expectedOrder = getContainerChartsExpectedOrder(metric);

        const { result } = renderHook(() =>
          useDockerContainerPageViewMetricsCharts({ metricsDataViewId, metric })
        );
        await waitFor(() => new Promise((resolve) => resolve(null)));

        const { charts } = result.current;

        expect(charts).toHaveLength(expectedOrder.length);

        charts.forEach((chart, index) => {
          expect(chart).toHaveProperty('id', expectedOrder[index]);
        });
      }
    );
  });
});

describe('useDockerKPIMetricsCharts', () => {
  it('should return an array of charts with correct order', async () => {
    const expectedOrder = ['cpuUsage', 'memoryUsage'];
    const { result } = renderHook(() =>
      useDockerContainerKpiCharts({ dataViewId: metricsDataViewId })
    );
    await waitFor(() => {
      expect(result.current).toHaveLength(expectedOrder.length);
      result.current.forEach((chart, index) => {
        expect(chart).toHaveProperty('id', expectedOrder[index]);
      });
    });
  });
});

describe('useK8sContainerCharts', () => {
  describe.each<[ContainerMetricTypes]>([['cpu'], ['memory']])('%s', (item) => {
    test.each<[ContainerMetricTypes]>([[item]])(
      'should return an array of charts with correct order for metric "%s"',
      async (metric) => {
        const expectedOrder = getK8sContainerChartsExpectedOrder(metric);

        const { result } = renderHook(() =>
          useK8sContainerPageViewMetricsCharts({ metricsDataViewId, metric })
        );
        await waitFor(() => new Promise((resolve) => resolve(null)));

        const { charts } = result.current;

        expect(charts).toHaveLength(expectedOrder.length);

        charts.forEach((chart, index) => {
          expect(chart).toHaveProperty('id', expectedOrder[index]);
        });
      }
    );
  });
});

describe('useK8sContainerKPIMetricsCharts', () => {
  it('should return an array of charts with correct order', async () => {
    const expectedOrder = ['k8sCpuUsage', 'k8sMemoryUsage'];
    const { result } = renderHook(() =>
      useK8sContainerKpiCharts({ dataViewId: metricsDataViewId })
    );
    await waitFor(() => {
      expect(result.current).toHaveLength(expectedOrder.length);
      result.current.forEach((chart, index) => {
        expect(chart).toHaveProperty('id', expectedOrder[index]);
      });
    });
  });
});

describe('Container subtitle patterns', () => {
  describe('Max formulas', () => {
    it('should match formulas starting with max', () => {
      expect(getSubtitleFromFormula('max(container.cpu.usage)')).toBe('Max');
    });

    it('should match formulas with arithmetic before max', () => {
      expect(getSubtitleFromFormula('1 - max(container.memory.usage)')).toBe('Max');
      expect(getSubtitleFromFormula('100 * max(container.cpu.usage)')).toBe('Max');
    });

    it('should match formulas with parentheses around max', () => {
      expect(getSubtitleFromFormula('(max(container.cpu.usage))')).toBe('Max');
    });

    it('should NOT match when max is nested inside another function', () => {
      expect(getSubtitleFromFormula('sum(max(container.cpu.usage))')).toBe('');
    });

    it('should NOT match maximum (word boundary check)', () => {
      expect(getSubtitleFromFormula('maximum(container.cpu.usage)')).toBe('');
    });
  });

  describe('Average formulas', () => {
    it('should match formulas starting with avg', () => {
      expect(getSubtitleFromFormula('avg(container.cpu.usage)')).toBe('Average');
    });

    it('should match formulas starting with average', () => {
      expect(getSubtitleFromFormula('average(container.cpu.usage)')).toBe('Average');
    });

    it('should match formulas with arithmetic before avg', () => {
      expect(getSubtitleFromFormula('1 - avg(container.memory.usage)')).toBe('Average');
      expect(getSubtitleFromFormula('100 * avg(container.cpu.usage)')).toBe('Average');
    });

    it('should match formulas with arithmetic before average', () => {
      expect(getSubtitleFromFormula('1 - average(container.memory.usage)')).toBe('Average');
      expect(getSubtitleFromFormula('100 * average(container.cpu.usage)')).toBe('Average');
    });

    it('should match formulas with parentheses around avg/average', () => {
      expect(getSubtitleFromFormula('(avg(container.cpu.usage))')).toBe('Average');
      expect(getSubtitleFromFormula('(average(container.cpu.usage))')).toBe('Average');
    });

    it('should NOT match when avg is nested inside another function', () => {
      expect(getSubtitleFromFormula('sum(avg(container.cpu.usage))')).toBe('');
    });

    it('should NOT match averaging (word boundary check)', () => {
      expect(getSubtitleFromFormula('averaging(container.cpu.usage)')).toBe('');
    });
  });
});
