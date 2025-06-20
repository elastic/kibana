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
  DISK_IOPS_LABEL,
  DISK_THROUGHPUT_LABEL,
  DISK_USAGE_BY_MOUNT_POINT_LABEL,
} from '../../../shared/charts/constants';

export const disk = {
  get: ({ schemas }: { schemas: Array<'ecs' | 'semconv'> }) => {
    const resolvedFormula = formulas.get({ schemas });

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
              ...resolvedFormula.diskIORead,
              label: i18n.translate(
                'xpack.metricsData.assetDetails.metricsCharts.metric.label.read',
                {
                  defaultMessage: 'Read',
                }
              ),
            },
            {
              ...resolvedFormula.diskIOWrite,
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
      ...DEFAULT_XY_LEGEND,
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
            field: 'system.filesystem.mount_point',
            size: 5,
          },
          yAxis: [
            {
              ...resolvedFormula.diskUsageAverage,
              label: i18n.translate(
                'xpack.metricsData.assetDetails.metricsCharts.diskUsage.label.used',
                {
                  defaultMessage: 'Used',
                }
              ),
            },
          ],
        },
        {
          seriesType: 'area',
          type: 'series',
          xAxis: '@timestamp',
          breakdown: {
            type: 'topValues',
            field: 'attributes.mountpoint',
            size: 5,
          },
          yAxis: [
            {
              ...resolvedFormula.diskUsageAverageOTel,
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
      ...DEFAULT_XY_LEGEND,
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
              ...resolvedFormula.diskReadThroughput,
              label: i18n.translate(
                'xpack.metricsData.assetDetails.metricsCharts.metric.label.read',
                {
                  defaultMessage: 'Read',
                }
              ),
            },
            {
              ...resolvedFormula.diskWriteThroughput,
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
      ...DEFAULT_XY_LEGEND,
      ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
    };

    const diskSpaceAvailable: LensConfigWithId = {
      id: 'diskSpaceAvailable',
      chartType: 'xy',
      title: resolvedFormula.diskSpaceAvailable.label ?? '',
      layers: [
        {
          seriesType: 'line',
          type: 'series',
          xAxis: '@timestamp',
          yAxis: [resolvedFormula.diskSpaceAvailable],
        },
      ],
      ...DEFAULT_XY_FITTING_FUNCTION,
      ...DEFAULT_XY_HIDDEN_LEGEND,
      ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
    };

    const diskIORead: LensConfigWithId = {
      id: 'diskIORead',
      chartType: 'xy',
      title: resolvedFormula.diskIORead.label ?? '',
      layers: [
        {
          seriesType: 'line',
          type: 'series',
          xAxis: '@timestamp',
          yAxis: [resolvedFormula.diskIORead],
        },
      ],
      ...DEFAULT_XY_FITTING_FUNCTION,
      ...DEFAULT_XY_HIDDEN_LEGEND,
      ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
    };

    const diskIOWrite: LensConfigWithId = {
      id: 'diskIOWrite',
      chartType: 'xy',
      title: resolvedFormula.diskIOWrite.label ?? '',
      layers: [
        {
          seriesType: 'line',
          type: 'series',
          xAxis: '@timestamp',
          yAxis: [resolvedFormula.diskIOWrite],
        },
      ],
      ...DEFAULT_XY_FITTING_FUNCTION,
      ...DEFAULT_XY_HIDDEN_LEGEND,
      ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
    };

    const diskReadThroughput: LensConfigWithId = {
      id: 'diskReadThroughput',
      chartType: 'xy',
      title: resolvedFormula.diskReadThroughput.label ?? '',
      layers: [
        {
          seriesType: 'line',
          type: 'series',
          xAxis: '@timestamp',
          yAxis: [resolvedFormula.diskReadThroughput],
        },
      ],
      ...DEFAULT_XY_FITTING_FUNCTION,
      ...DEFAULT_XY_HIDDEN_LEGEND,
      ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
    };

    const diskWriteThroughput: LensConfigWithId = {
      id: 'diskWriteThroughput',
      chartType: 'xy',
      title: resolvedFormula.diskWriteThroughput.label ?? '',
      layers: [
        {
          seriesType: 'line',
          type: 'series',
          xAxis: '@timestamp',
          yAxis: [resolvedFormula.diskWriteThroughput],
        },
      ],
      ...DEFAULT_XY_FITTING_FUNCTION,
      ...DEFAULT_XY_HIDDEN_LEGEND,
      ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
    };

    const diskUsageMetric: LensConfigWithId = {
      id: 'diskUsage',
      chartType: 'metric',
      title: resolvedFormula.diskUsage.label ?? '',
      trendLine: true,
      ...resolvedFormula.diskUsage,
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
  },
};
