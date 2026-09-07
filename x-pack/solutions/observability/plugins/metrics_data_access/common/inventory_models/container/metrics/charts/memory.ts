/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensConfigWithId } from '../../../types';
import {
  DEFAULT_XY_FITTING_FUNCTION,
  DEFAULT_XY_HIDDEN_AXIS_TITLE,
  DEFAULT_XY_LEGEND,
  DEFAULT_XY_YBOUNDS,
  DEFAULT_LEGEND_STATS,
  MEMORY_USAGE_LABEL,
} from '../../../shared/charts/constants';
import { formulas } from '../formulas';

const dockerContainerMemoryUsageXY: LensConfigWithId = {
  id: 'memoryUsage',
  chartType: 'xy',
  title: MEMORY_USAGE_LABEL,
  layers: [
    {
      seriesType: 'line',
      type: 'series',
      xAxis: '@timestamp',
      yAxis: [formulas.dockerContainerMemoryUsage],
    },
    {
      type: 'reference',
      yAxis: [
        {
          value: '1',
        },
      ],
    },
  ],
  ...DEFAULT_XY_FITTING_FUNCTION,
  legend: {
    ...DEFAULT_XY_LEGEND.legend,
    legendStats: DEFAULT_LEGEND_STATS,
  },
  ...DEFAULT_XY_YBOUNDS,
  ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
};

const k8sContainerMemoryUsageXY: LensConfigWithId = {
  id: 'k8sMemoryUsage',
  chartType: 'xy',
  title: MEMORY_USAGE_LABEL,
  layers: [
    {
      seriesType: 'line',
      type: 'series',
      xAxis: '@timestamp',
      yAxis: [formulas.k8sContainerMemoryUsage],
    },
    {
      type: 'reference',
      yAxis: [
        {
          value: '1',
        },
      ],
    },
  ],
  ...DEFAULT_XY_FITTING_FUNCTION,
  legend: {
    ...DEFAULT_XY_LEGEND.legend,
    legendStats: DEFAULT_LEGEND_STATS,
  },
  ...DEFAULT_XY_YBOUNDS,
  ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
};

const dockerContainerMemoryUsageMetric: LensConfigWithId = {
  id: 'memoryUsage',
  chartType: 'metric',
  title: MEMORY_USAGE_LABEL,
  trendLine: true,
  ...formulas.dockerContainerMemoryUsage,
};

const k8sContainerMemoryUsageMetric: LensConfigWithId = {
  id: 'k8sMemoryUsage',
  chartType: 'metric',
  title: MEMORY_USAGE_LABEL,
  trendLine: true,
  ...formulas.k8sContainerMemoryUsage,
};

export const memory = {
  xy: {
    dockerContainerMemoryUsage: dockerContainerMemoryUsageXY,
    k8sContainerMemoryUsage: k8sContainerMemoryUsageXY,
  },
  metric: {
    dockerContainerMemoryUsage: dockerContainerMemoryUsageMetric,
    k8sContainerMemoryUsage: k8sContainerMemoryUsageMetric,
  },
};
