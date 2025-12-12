/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { LensConfigWithId } from '../../../types';
import type { HostFormulas } from '../formulas';
import {
  DEFAULT_XY_FITTING_FUNCTION,
  DEFAULT_XY_HIDDEN_AXIS_TITLE,
  DEFAULT_XY_LEGEND,
  DEFAULT_XY_YBOUNDS,
  DEFAULT_LEGEND_STATS,
  DISK_IOPS_LABEL,
  DISK_THROUGHPUT_LABEL,
  DISK_USAGE_BY_MOUNT_POINT_LABEL,
} from '../../../shared/charts/constants';
import { type FormulasCatalog } from '../../../shared/metrics/types';

export const init = (formulas: FormulasCatalog<HostFormulas>) => {
  const diskIOReadWrite: LensConfigWithId = {
    id: 'diskIOReadWrite',
    chartType: 'xy',
    title: DISK_IOPS_LABEL,
    layers: [
      {
        seriesType: 'area',
        type: 'series',
        xAxis: '@timestamp',
        yAxis: [
          {
            ...formulas.get('diskIORead'),
            label: i18n.translate(
              'xpack.metricsData.assetDetails.metricsCharts.metric.label.read',
              {
                defaultMessage: 'Read',
              }
            ),
          },
          {
            ...formulas.get('diskIOWrite'),
            label: i18n.translate(
              'xpack.metricsData.assetDetails.metricsCharts.metric.label.write',
              {
                defaultMessage: 'Write',
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

  const diskUsageByMountPoint: LensConfigWithId = {
    id: 'diskUsageByMountPoint',
    chartType: 'xy',
    title: DISK_USAGE_BY_MOUNT_POINT_LABEL,
    layers: [
      {
        seriesType: 'area',
        type: 'series',
        xAxis: '@timestamp',
        breakdown: {
          type: 'topValues',
          field:
            formulas.schema === 'ecs' ? 'system.filesystem.mount_point' : 'attributes.mountpoint',
          size: 15,
        },
        yAxis: [
          {
            ...formulas.get('diskUsageAverage'),
            label: i18n.translate(
              'xpack.metricsData.assetDetails.metricsCharts.diskUsage.label.used',
              {
                defaultMessage: 'Used',
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
    ...DEFAULT_XY_YBOUNDS,
    ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
  };

  const diskThroughputReadWrite: LensConfigWithId = {
    id: 'diskThroughputReadWrite',
    chartType: 'xy',
    title: DISK_THROUGHPUT_LABEL,
    layers: [
      {
        seriesType: 'area',
        type: 'series',
        xAxis: '@timestamp',
        yAxis: [
          {
            ...formulas.get('diskReadThroughput'),
            label: i18n.translate(
              'xpack.metricsData.assetDetails.metricsCharts.metric.label.read',
              {
                defaultMessage: 'Read',
              }
            ),
          },
          {
            ...formulas.get('diskWriteThroughput'),
            label: i18n.translate(
              'xpack.metricsData.assetDetails.metricsCharts.metric.label.write',
              {
                defaultMessage: 'Write',
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

  const diskSpaceAvailable: LensConfigWithId = {
    id: 'diskSpaceAvailable',
    chartType: 'xy',
    title: formulas.get('diskSpaceAvailable').label ?? '',
    layers: [
      {
        seriesType: 'line',
        type: 'series',
        xAxis: '@timestamp',
        yAxis: [formulas.get('diskSpaceAvailable')],
      },
    ],
    ...DEFAULT_XY_FITTING_FUNCTION,
    legend: {
      ...DEFAULT_XY_LEGEND.legend,
      legendStats: DEFAULT_LEGEND_STATS,
    },
    ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
  };

  const diskIORead: LensConfigWithId = {
    id: 'diskIORead',
    chartType: 'xy',
    title: formulas.get('diskIORead').label ?? '',
    layers: [
      {
        seriesType: 'line',
        type: 'series',
        xAxis: '@timestamp',
        yAxis: [formulas.get('diskIORead')],
      },
    ],
    ...DEFAULT_XY_FITTING_FUNCTION,
    legend: {
      ...DEFAULT_XY_LEGEND.legend,
      legendStats: DEFAULT_LEGEND_STATS,
    },
    ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
  };

  const diskIOWrite: LensConfigWithId = {
    id: 'diskIOWrite',
    chartType: 'xy',
    title: formulas.get('diskIOWrite').label ?? '',
    layers: [
      {
        seriesType: 'line',
        type: 'series',
        xAxis: '@timestamp',
        yAxis: [formulas.get('diskIOWrite')],
      },
    ],
    ...DEFAULT_XY_FITTING_FUNCTION,
    legend: {
      ...DEFAULT_XY_LEGEND.legend,
      legendStats: DEFAULT_LEGEND_STATS,
    },
    ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
  };

  const diskReadThroughput: LensConfigWithId = {
    id: 'diskReadThroughput',
    chartType: 'xy',
    title: formulas.get('diskReadThroughput').label ?? '',
    layers: [
      {
        seriesType: 'line',
        type: 'series',
        xAxis: '@timestamp',
        yAxis: [formulas.get('diskReadThroughput')],
      },
    ],
    ...DEFAULT_XY_FITTING_FUNCTION,
    legend: {
      ...DEFAULT_XY_LEGEND.legend,
      legendStats: DEFAULT_LEGEND_STATS,
    },
    ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
  };

  const diskWriteThroughput: LensConfigWithId = {
    id: 'diskWriteThroughput',
    chartType: 'xy',
    title: formulas.get('diskWriteThroughput').label ?? '',
    layers: [
      {
        seriesType: 'line',
        type: 'series',
        xAxis: '@timestamp',
        yAxis: [formulas.get('diskWriteThroughput')],
      },
    ],
    ...DEFAULT_XY_FITTING_FUNCTION,
    legend: {
      ...DEFAULT_XY_LEGEND.legend,
      legendStats: DEFAULT_LEGEND_STATS,
    },
    ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
  };

  const diskUsageMetric: LensConfigWithId = {
    id: 'diskUsage',
    chartType: 'metric',
    title: formulas.get('diskUsage').label ?? '',
    trendLine: true,
    ...formulas.get('diskUsage'),
  };

  return {
    xy: {
      diskThroughputReadWrite,
      diskUsageByMountPoint,
      diskIOReadWrite,
      diskSpaceAvailable,
      diskIORead,
      diskIOWrite,
      diskReadThroughput,
      diskWriteThroughput,
    },
    metric: {
      diskUsage: diskUsageMetric,
    },
  };
};
