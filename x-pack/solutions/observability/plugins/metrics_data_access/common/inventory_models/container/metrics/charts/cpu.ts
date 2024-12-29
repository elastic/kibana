/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CPU_USAGE_LABEL,
  DEFAULT_XY_FITTING_FUNCTION,
  DEFAULT_XY_HIDDEN_AXIS_TITLE,
  DEFAULT_XY_HIDDEN_LEGEND,
  DEFAULT_XY_YBOUNDS,
} from '../../../shared/charts/constants';
import { LensConfigWithId } from '../../../types';
import { formulas } from '../formulas';

const dockerContainerCpuUsageXY: LensConfigWithId = {
  id: 'cpuUsage',
  chartType: 'xy',
  title: CPU_USAGE_LABEL,
  layers: [
    {
      seriesType: 'line',
      type: 'series',
      xAxis: '@timestamp',
      yAxis: [formulas.dockerContainerCpuUsage],
    },
  ],
  ...DEFAULT_XY_FITTING_FUNCTION,
  ...DEFAULT_XY_HIDDEN_LEGEND,
  ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
  ...DEFAULT_XY_YBOUNDS,
};

const k8sContainerCpuUsageXY: LensConfigWithId = {
  id: 'k8sCpuUsage',
  chartType: 'xy',
  title: CPU_USAGE_LABEL,
  layers: [
    {
      seriesType: 'line',
      type: 'series',
      xAxis: '@timestamp',
      yAxis: [formulas.k8sContainerCpuUsage],
    },
  ],
  ...DEFAULT_XY_FITTING_FUNCTION,
  ...DEFAULT_XY_HIDDEN_LEGEND,
  ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
  ...DEFAULT_XY_YBOUNDS,
};

const dockerContainerCpuUsageMetric: LensConfigWithId = {
  id: 'cpuUsage',
  chartType: 'metric',
  title: CPU_USAGE_LABEL,
  trendLine: true,
  ...formulas.dockerContainerCpuUsage,
};

const containerK8sCpuUsageMetric: LensConfigWithId = {
  id: 'k8sCpuUsage',
  chartType: 'metric',
  title: CPU_USAGE_LABEL,
  trendLine: true,
  ...formulas.k8sContainerCpuUsage,
};

export const cpu = {
  xy: {
    dockerContainerCpuUsage: dockerContainerCpuUsageXY,
    k8sContainerCpuUsage: k8sContainerCpuUsageXY,
  },
  metric: {
    dockerContainerCpuUsage: dockerContainerCpuUsageMetric,
    k8sContainerCpuUsage: containerK8sCpuUsageMetric,
  },
} as const;
