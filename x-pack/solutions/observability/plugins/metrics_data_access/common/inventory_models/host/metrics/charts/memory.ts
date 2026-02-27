/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { LensConfigWithId } from '../../../types';
import {
  DEFAULT_XY_FITTING_FUNCTION,
  DEFAULT_XY_HIDDEN_AXIS_TITLE,
  DEFAULT_XY_LEGEND,
  DEFAULT_XY_YBOUNDS,
  DEFAULT_LEGEND_STATS,
  MEMORY_USAGE_LABEL,
} from '../../../shared/charts/constants';
import type { FormulasCatalog } from '../../../shared/metrics/types';
import type { HostFormulas } from '../formulas';

export const init = (formulas: FormulasCatalog<HostFormulas>) => {
  const memoryUsageBreakdown: LensConfigWithId = {
    id: 'memoryUsageBreakdown',
    chartType: 'xy',
    title: MEMORY_USAGE_LABEL,
    layers: [
      {
        seriesType: 'area',
        type: 'series',
        xAxis: '@timestamp',
        yAxis: [
          {
            ...formulas.get('memoryCache'),
            label: i18n.translate(
              'xpack.metricsData.assetDetails.metricsCharts.metric.label.cache',
              {
                defaultMessage: 'Cache',
              }
            ),
          },
          {
            ...formulas.get('memoryUsed'),
            label: i18n.translate(
              'xpack.metricsData.assetDetails.metricsCharts.metric.label.used',
              {
                defaultMessage: 'Used',
              }
            ),
          },
          {
            ...formulas.get('memoryFreeExcludingCache'),
            label: i18n.translate(
              'xpack.metricsData.assetDetails.metricsCharts.metric.label.free',
              {
                defaultMessage: 'Free',
              }
            ),
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

  const memoryUsageXY: LensConfigWithId = {
    id: 'memoryUsage',
    chartType: 'xy',
    title: formulas.get('memoryUsage').label ?? '',
    layers: [
      {
        seriesType: 'line',
        type: 'series',
        xAxis: '@timestamp',
        yAxis: [formulas.get('memoryUsage')],
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

  const memoryFree: LensConfigWithId = {
    id: 'memoryFree',
    chartType: 'xy',
    title: formulas.get('memoryFree').label ?? '',
    layers: [
      {
        seriesType: 'line',
        type: 'series',
        xAxis: '@timestamp',
        yAxis: [formulas.get('memoryFree')],
      },
    ],
    ...DEFAULT_XY_FITTING_FUNCTION,
    legend: {
      ...DEFAULT_XY_LEGEND.legend,
      legendStats: DEFAULT_LEGEND_STATS,
    },
    ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
  };

  const memoryUsageMetric: LensConfigWithId = {
    id: 'memoryUsage',
    chartType: 'metric',
    title: formulas.get('memoryUsage').label ?? '',
    trendLine: true,
    ...formulas.get('memoryUsage'),
  };

  return {
    xy: {
      memoryUsageBreakdown,
      memoryUsage: memoryUsageXY,
      memoryFree,
    },
    metric: {
      memoryUsage: memoryUsageMetric,
    },
  };
};
