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
  DEFAULT_XY_LEGEND,
  DEFAULT_XY_YBOUNDS,
  DEFAULT_LEGEND_STATS,
} from '../../../shared/charts/constants';
import type { FormulasCatalog } from '../../../shared/metrics/types';
import type { LensConfigWithId } from '../../../types';
import type { HostFormulas } from '../formulas';

export const init = (formulas: FormulasCatalog<HostFormulas>) => {
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
          formulas.get('cpuUsageIowait'),
          formulas.get('cpuUsageIrq'),
          formulas.get('cpuUsageNice'),
          formulas.get('cpuUsageSoftirq'),
          formulas.get('cpuUsageSteal'),
          formulas.get('cpuUsageUser'),
          formulas.get('cpuUsageSystem'),
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

  const loadBreakdown: LensConfigWithId = {
    id: 'loadBreakdown',
    chartType: 'xy',
    title: LOAD_LABEL,
    layers: [
      {
        seriesType: 'area',
        type: 'series',
        xAxis: '@timestamp',
        yAxis: [formulas.get('load1m'), formulas.get('load5m'), formulas.get('load15m')],
      },
    ],
    ...DEFAULT_XY_FITTING_FUNCTION,
    legend: {
      ...DEFAULT_XY_LEGEND.legend,
      legendStats: DEFAULT_LEGEND_STATS,
    },
    ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
  };

  const cpuUsageXY: LensConfigWithId = {
    id: 'cpuUsage',
    chartType: 'xy',
    title: formulas.get('cpuUsage').label ?? '',
    layers: [
      {
        seriesType: 'line',
        type: 'series',
        xAxis: '@timestamp',
        yAxis: [formulas.get('cpuUsage')],
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

  const normalizedLoad1mXY: LensConfigWithId = {
    id: 'normalizedLoad1m',
    chartType: 'xy',
    title: formulas.get('normalizedLoad1m').label ?? '',
    layers: [
      {
        seriesType: 'line',
        type: 'series',
        xAxis: '@timestamp',
        yAxis: [formulas.get('normalizedLoad1m')],
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
    ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
  };

  // KPI tiles deliberately render *without* a trend line (P15a). Setting
  // `trendLine: true` makes Lens issue a second aggregation per tile with a
  // `date_histogram` sub-aggregation, which scales with
  // `host_count × bucket_count × per-state slices` — the dominant cost on the
  // 500-host / 24h workload (see PROPOSALS.md §P15). The faint line behind the
  // headline number is the only thing it produces visually, and at typical
  // fleet-average values it is near-flat and barely perceptible. If product
  // signals the trend line is genuinely missed, P15c covers the range-aware
  // ES|QL re-introduction with a ≤ 100-bucket policy.
  const cpuUsageMetric: LensConfigWithId = {
    id: 'cpuUsage',
    chartType: 'metric',
    title: formulas.get('cpuUsage').label ?? '',
    ...formulas.get('cpuUsage'),
  };

  const normalizedLoad1mMetric: LensConfigWithId = {
    id: 'normalizedLoad1m',
    chartType: 'metric',
    title: formulas.get('normalizedLoad1m').label ?? '',
    ...formulas.get('normalizedLoad1m'),
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
};
