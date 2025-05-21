/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CPU_USAGE_LABEL,
  LOAD_LABEL,
  DEFAULT_XY_FITTING_FUNCTION,
  DEFAULT_XY_HIDDEN_AXIS_TITLE,
  DEFAULT_XY_HIDDEN_LEGEND,
  DEFAULT_XY_LEGEND,
  DEFAULT_XY_YBOUNDS,
} from '../../../shared/charts/constants';
import type { LensConfigWithId } from '../../../types';
import { formulas } from '../formulas';

export const cpu = {
  get: ({ schemas }: { schemas: Array<'ecs' | 'semconv'> }) => {
    const resolvedFormula = formulas.get({ schemas });

    const cpuUsageBreakdown: LensConfigWithId = {
      id: 'cpuUsageBreakdown',
      chartType: 'xy',
      title: CPU_USAGE_LABEL,
      layers: [
        {
          seriesType: 'area',
          type: 'series',
          xAxis: '@timestamp',
          yAxis: [
            resolvedFormula.cpuUsageIowait,
            resolvedFormula.cpuUsageIrq,
            resolvedFormula.cpuUsageNice,
            resolvedFormula.cpuUsageSoftirq,
            resolvedFormula.cpuUsageSteal,
            resolvedFormula.cpuUsageUser,
            resolvedFormula.cpuUsageSystem,
          ],
        },
      ],
      ...DEFAULT_XY_FITTING_FUNCTION,
      ...DEFAULT_XY_LEGEND,
      ...DEFAULT_XY_YBOUNDS,
      ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
    };

    const loadBreakdown: LensConfigWithId = {
      id: 'loadBreakdown',
      chartType: 'xy',
      title: LOAD_LABEL,
      layers: [
        {
          seriesType: 'area',
          type: 'series',
          xAxis: '@timestamp',
          yAxis: [resolvedFormula.load1m, resolvedFormula.load5m, resolvedFormula.load15m],
        },
      ],
      ...DEFAULT_XY_FITTING_FUNCTION,
      ...DEFAULT_XY_LEGEND,
      ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
    };

    const cpuUsageXY: LensConfigWithId = {
      id: 'cpuUsage',
      chartType: 'xy',
      title: resolvedFormula.cpuUsage.label ?? '',
      layers: [
        {
          seriesType: 'line',
          type: 'series',
          xAxis: '@timestamp',
          yAxis: [resolvedFormula.cpuUsage],
        },
      ],
      ...DEFAULT_XY_FITTING_FUNCTION,
      ...DEFAULT_XY_HIDDEN_LEGEND,
      ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
      ...DEFAULT_XY_YBOUNDS,
    };

    const normalizedLoad1mXY: LensConfigWithId = {
      id: 'normalizedLoad1m',
      chartType: 'xy',
      title: resolvedFormula.normalizedLoad1m.label ?? '',
      layers: [
        {
          seriesType: 'line',
          type: 'series',
          xAxis: '@timestamp',
          yAxis: [resolvedFormula.normalizedLoad1m],
        },
        {
          type: 'reference',
          yAxis: [{ value: '1' }],
        },
      ],
      ...DEFAULT_XY_FITTING_FUNCTION,
      ...DEFAULT_XY_HIDDEN_LEGEND,
      ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
    };

    const cpuUsageMetric: LensConfigWithId = {
      id: 'cpuUsage',
      chartType: 'metric',
      title: resolvedFormula.cpuUsage.label ?? '',
      trendLine: true,
      ...resolvedFormula.cpuUsage,
    };

    const normalizedLoad1mMetric: LensConfigWithId = {
      id: 'normalizedLoad1m',
      chartType: 'metric',
      title: resolvedFormula.normalizedLoad1m.label ?? '',
      trendLine: true,
      ...resolvedFormula.normalizedLoad1m,
    };

    return {
      xy: {
        cpuUsageBreakdown,
        loadBreakdown,
        cpuUsage: cpuUsageXY,
        normalizedLoad1m: normalizedLoad1mXY,
      },
      metric: {
        cpuUsage: cpuUsageMetric,
        normalizedLoad1m: normalizedLoad1mMetric,
      },
    };
  },
};
