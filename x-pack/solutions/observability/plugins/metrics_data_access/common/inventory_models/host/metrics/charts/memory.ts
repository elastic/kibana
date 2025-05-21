/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { LensConfigWithId } from '../../../types';
import { formulas } from '../formulas';
import {
  DEFAULT_XY_FITTING_FUNCTION,
  DEFAULT_XY_HIDDEN_AXIS_TITLE,
  DEFAULT_XY_HIDDEN_LEGEND,
  DEFAULT_XY_LEGEND,
  DEFAULT_XY_YBOUNDS,
  MEMORY_USAGE_LABEL,
} from '../../../shared/charts/constants';

export const memory = {
  get: ({ schemas }: { schemas: Array<'ecs' | 'semconv'> }) => {
    const resolvedFormula = formulas.get({ schemas });

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
              ...resolvedFormula.memoryCache,
              label: i18n.translate(
                'xpack.metricsData.assetDetails.metricsCharts.metric.label.cache',
                {
                  defaultMessage: 'Cache',
                }
              ),
            },
            {
              ...resolvedFormula.memoryUsed,
              label: i18n.translate(
                'xpack.metricsData.assetDetails.metricsCharts.metric.label.used',
                {
                  defaultMessage: 'Used',
                }
              ),
            },
            {
              ...resolvedFormula.memoryFreeExcludingCache,
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
      ...DEFAULT_XY_LEGEND,
      ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
    };

    const memoryUsageXY: LensConfigWithId = {
      id: 'memoryUsage',
      chartType: 'xy',
      title: resolvedFormula.memoryUsage.label ?? '',
      layers: [
        {
          seriesType: 'line',
          type: 'series',
          xAxis: '@timestamp',
          yAxis: [resolvedFormula.memoryUsage],
        },
      ],
      ...DEFAULT_XY_FITTING_FUNCTION,
      ...DEFAULT_XY_HIDDEN_LEGEND,
      ...DEFAULT_XY_YBOUNDS,
      ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
    };

    const memoryFree: LensConfigWithId = {
      id: 'memoryFree',
      chartType: 'xy',
      title: resolvedFormula.memoryFree.label ?? '',
      layers: [
        {
          seriesType: 'line',
          type: 'series',
          xAxis: '@timestamp',
          yAxis: [resolvedFormula.memoryFree],
        },
      ],
      ...DEFAULT_XY_FITTING_FUNCTION,
      ...DEFAULT_XY_HIDDEN_LEGEND,
      ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
    };

    const memoryUsageMetric: LensConfigWithId = {
      id: 'memoryUsage',
      chartType: 'metric',
      title: resolvedFormula.memoryUsage.label ?? '',
      trendLine: true,
      ...resolvedFormula.memoryUsage,
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
  },
};
