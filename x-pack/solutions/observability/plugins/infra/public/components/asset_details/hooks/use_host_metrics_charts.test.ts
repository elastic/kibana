/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor, renderHook } from '@testing-library/react';
import type { HostMetricTypes } from '../charts/types';
import {
  useHostKpiCharts,
  useHostCharts,
  useKubernetesCharts,
  getSubtitleFromFormula,
} from './use_host_metrics_charts';

const indexPattern = 'metrics-*';
const getHostChartsExpectedOrder = (metric: HostMetricTypes, overview: boolean): string[] => {
  switch (metric) {
    case 'cpu':
      return overview
        ? ['cpuUsage', 'normalizedLoad1m']
        : ['cpuUsage', 'cpuUsageBreakdown', 'normalizedLoad1m', 'loadBreakdown'];
    case 'memory':
      return overview ? ['memoryUsage'] : ['memoryUsage', 'memoryUsageBreakdown'];
    case 'network':
      return ['rxTx'];
    case 'disk':
      return overview
        ? ['diskUsageByMountPoint', 'diskIOReadWrite']
        : ['diskUsageByMountPoint', 'diskIOReadWrite', 'diskThroughputReadWrite'];
    case 'log':
      return ['logRate'];
    default:
      return [];
  }
};

describe('useHostCharts', () => {
  describe.each<[HostMetricTypes]>([['cpu'], ['memory'], ['network'], ['disk'], ['log']])(
    '%s',
    (item) => {
      test.each<[HostMetricTypes]>([[item]])(
        'should return an array of charts with correct order for metric "%s"',
        async (metric) => {
          const expectedOrder = getHostChartsExpectedOrder(metric, false);

          const { result } = renderHook(() => useHostCharts({ indexPattern, metric }));
          await waitFor(() => new Promise((resolve) => resolve(null)));

          const { charts } = result.current;

          expect(charts).toHaveLength(expectedOrder.length);

          charts.forEach((chart, index) => {
            expect(chart).toHaveProperty('id', expectedOrder[index]);
          });
        }
      );

      test.each<[HostMetricTypes]>([[item]])(
        'should return an array of charts with correct order for metric "%s" - overview',
        async (metric) => {
          const expectedOrder = getHostChartsExpectedOrder(metric, true);

          const { result } = renderHook(() =>
            useHostCharts({ indexPattern, metric, overview: true })
          );
          await waitFor(() => new Promise((resolve) => resolve(null)));

          const { charts } = result.current;

          expect(charts).toHaveLength(expectedOrder.length);

          charts.forEach((chart, index) => {
            expect(chart).toHaveProperty('id', expectedOrder[index]);
          });
        }
      );
    }
  );
});

describe('useKubernetesCharts', () => {
  it('should return an array of charts with correct order - overview', async () => {
    const { result } = renderHook(() => useKubernetesCharts({ indexPattern, overview: true }));
    await waitFor(() => new Promise((resolve) => resolve(null)));

    const expectedOrder = ['nodeCpuCapacity', 'nodeMemoryCapacity'];

    const { charts } = result.current;

    expect(charts).toHaveLength(expectedOrder.length);

    charts.forEach((chart, index) => {
      expect(chart).toHaveProperty('id', expectedOrder[index]);
    });
  });

  it('should return an array of charts with correct order', async () => {
    const { result } = renderHook(() => useKubernetesCharts({ indexPattern }));
    await waitFor(() => new Promise((resolve) => resolve(null)));

    const expectedOrder = [
      'nodeCpuCapacity',
      'nodeMemoryCapacity',
      'nodeDiskCapacity',
      'nodePodCapacity',
    ];

    const { charts } = result.current;

    expect(charts).toHaveLength(expectedOrder.length);

    charts.forEach((chart, index) => {
      expect(chart).toHaveProperty('id', expectedOrder[index]);
    });
  });
});

describe('useHostKpiCharts', () => {
  it('should return an array of charts with correct order', async () => {
    const { result } = renderHook(() => useHostKpiCharts({ indexPattern }));
    await waitFor(() => new Promise((resolve) => resolve(null)));

    const expectedOrder = ['cpuUsage', 'normalizedLoad1m', 'memoryUsage', 'diskUsage'];

    expect(result.current).toHaveLength(expectedOrder.length);

    result.current.forEach((chart, index) => {
      expect(chart).toHaveProperty('id', expectedOrder[index]);
      // diskUsage should have subtitle 'Max'
      expect(chart).toHaveProperty('subtitle', index === 3 ? 'Max' : 'Average');
      expect(chart).toHaveProperty('decimals', 1);
    });
  });

  it('should return an array of charts with correct options', async () => {
    const options = {
      seriesColor: 'blue',
      getSubtitle: () => 'Custom Subtitle',
    };

    const { result } = renderHook(() => useHostKpiCharts({ indexPattern, ...options }));
    await waitFor(() => new Promise((resolve) => resolve(null)));

    expect(result.current).toHaveLength(4);

    result.current.forEach((chart) => {
      expect(chart).toHaveProperty('seriesColor', options.seriesColor);
      expect(chart).toHaveProperty('subtitle', 'Custom Subtitle');
    });
  });
});

describe('getSubtitleFromFormula', () => {
  describe('max formulas', () => {
    it('should return "Max" when formula starts with max', () => {
      expect(getSubtitleFromFormula('max(system.cpu.user.pct)')).toBe('Max');
    });

    it('should return "Max" when formula starts with "1 - max"', () => {
      expect(getSubtitleFromFormula('1 - max(system.memory.actual.free)')).toBe('Max');
    });

    it('should return "Max" when formula starts with arithmetic then max', () => {
      expect(getSubtitleFromFormula('100 * max(system.cpu.total.norm.pct)')).toBe('Max');
    });

    it('should return "Max" when formula has parentheses before max', () => {
      expect(getSubtitleFromFormula('(1 - max(system.memory.free))')).toBe('Max');
    });

    it('should return "Max" when formula has spaces before max', () => {
      expect(getSubtitleFromFormula('  max(system.cpu.total)')).toBe('Max');
    });

    it('should return "Max" when formula has complex arithmetic before max', () => {
      expect(getSubtitleFromFormula('(1 - (max(system.memory.free) / 100))')).toBe('Max');
    });

    it('should return "Max" for case-insensitive MAX', () => {
      expect(getSubtitleFromFormula('MAX(system.cpu.user.pct)')).toBe('Max');
    });
  });

  describe('avg formulas', () => {
    it('should return "Average" when formula starts with avg', () => {
      expect(getSubtitleFromFormula('avg(system.cpu.user.pct)')).toBe('Average');
    });

    it('should return "Average" when formula starts with "1 - avg"', () => {
      expect(getSubtitleFromFormula('1 - avg(system.memory.actual.free)')).toBe('Average');
    });

    it('should return "Average" when formula starts with arithmetic then avg', () => {
      expect(getSubtitleFromFormula('100 * avg(system.cpu.total.norm.pct)')).toBe('Average');
    });

    it('should return "Average" when formula has parentheses before avg', () => {
      expect(getSubtitleFromFormula('(1 - avg(system.memory.free))')).toBe('Average');
    });

    it('should return "Average" when formula has spaces before avg', () => {
      expect(getSubtitleFromFormula('  avg(system.cpu.total)')).toBe('Average');
    });

    it('should return "Average" for case-insensitive AVG', () => {
      expect(getSubtitleFromFormula('AVG(system.cpu.user.pct)')).toBe('Average');
    });
  });

  describe('formulas without max or avg as first word', () => {
    it('should return "Average" as fallback when formula does not start with max or avg', () => {
      expect(getSubtitleFromFormula('sum(system.cpu.user.pct)')).toBe('Average');
    });

    it('should return "Average" when avg is the first function (even with nested max)', () => {
      expect(getSubtitleFromFormula('avg(max(system.cpu.user.pct))')).toBe('Average');
    });

    it('should return "Average" as fallback when avg is not the first function', () => {
      expect(getSubtitleFromFormula('sum(avg(system.cpu.user.pct))')).toBe('Average');
    });

    it('should return "Average" as fallback for min formula', () => {
      expect(getSubtitleFromFormula('min(system.cpu.user.pct)')).toBe('Average');
    });

    it('should return "Average" as fallback for count formula', () => {
      expect(getSubtitleFromFormula('count(system.cpu.cores)')).toBe('Average');
    });
  });

  describe('edge cases', () => {
    it('should return "Average" as fallback for empty formula', () => {
      expect(getSubtitleFromFormula('')).toBe('Average');
    });

    it('should not match max if it is part of a longer word (returns Average fallback)', () => {
      expect(getSubtitleFromFormula('maximum(system.cpu.user.pct)')).toBe('Average');
    });

    it('should not match avg if it is part of a longer word (returns Average fallback)', () => {
      expect(getSubtitleFromFormula('average(system.cpu.user.pct)')).toBe('Average');
    });
  });
});
