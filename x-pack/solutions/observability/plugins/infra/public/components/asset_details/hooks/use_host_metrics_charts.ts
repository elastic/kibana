/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { findInventoryModel } from '@kbn/metrics-data-access-plugin/common';
import { useMemo } from 'react';
import useAsync from 'react-use/lib/useAsync';
import { usePreferredSchemaContext } from '../../../hooks/use_preferred_schema';
import type { HostMetricTypes } from '../charts/types';
import { useChartSeriesColor } from './use_chart_series_color';

export const useHostCharts = ({
  metric,
  dataViewId,
  overview,
}: {
  metric: HostMetricTypes;
  dataViewId?: string;
  overview?: boolean;
}) => {
  const { preferredSchema } = usePreferredSchemaContext();

  const { value: charts = [], error } = useAsync(async () => {
    const hostCharts = await getHostsCharts({
      metric,
      overview,
      schemas: preferredSchema,
    });
    return hostCharts.map((chart) => ({
      ...chart,
      ...(dataViewId && {
        dataset: {
          index: dataViewId,
        },
      }),
    }));
  }, [dataViewId, metric, overview, preferredSchema]);

  return { charts, error };
};

export const useKubernetesCharts = ({
  dataViewId,
  overview,
}: {
  dataViewId?: string;
  overview?: boolean;
}) => {
  const model = useMemo(() => findInventoryModel('host'), []);

  const { value: charts = [], error } = useAsync(async () => {
    const { kibernetesNode } = await model.metrics.getCharts({ schemas: ['ecs'] });

    const items = overview
      ? [kibernetesNode.xy.nodeCpuCapacity, kibernetesNode.xy.nodeMemoryCapacity]
      : [
          kibernetesNode.xy.nodeCpuCapacity,
          kibernetesNode.xy.nodeMemoryCapacity,
          kibernetesNode.xy.nodeDiskCapacity,
          kibernetesNode.xy.nodePodCapacity,
        ];

    return items.map((chart) => {
      return {
        ...chart,
        ...(dataViewId && {
          dataset: {
            index: dataViewId,
          },
        }),
      };
    });
  }, [dataViewId, overview, model.metrics]);

  return { charts, error };
};

const getSubtitleFromFormula = (value: string) =>
  value.startsWith('max')
    ? i18n.translate('xpack.infra.hostsViewPage.kpi.subtitle.max', { defaultMessage: 'Max' })
    : i18n.translate('xpack.infra.assetDetails.kpi.subtitle.average', {
        defaultMessage: 'Average',
      });

export const useHostKpiCharts = ({
  dataViewId,
  seriesColor,
  getSubtitle,
}: {
  dataViewId?: string;
  seriesColor?: string;
  getSubtitle?: (formulaValue: string) => string;
}) => {
  seriesColor = useChartSeriesColor(seriesColor);

  const { preferredSchema } = usePreferredSchemaContext();

  const { value: charts = [] } = useAsync(async () => {
    const model = findInventoryModel('host');
    const { cpu, memory, disk } = await model.metrics.getCharts({
      schemas: preferredSchema,
    });

    return [
      cpu.metric.cpuUsage,
      cpu.metric.normalizedLoad1m,
      memory.metric.memoryUsage,
      disk.metric.diskUsage,
    ].map((chart) => ({
      ...chart,
      seriesColor,
      decimals: 1,
      subtitle: getSubtitle ? getSubtitle(chart.value) : getSubtitleFromFormula(chart.value),
      ...(dataViewId && {
        dataset: {
          index: dataViewId,
        },
      }),
    }));
  }, [preferredSchema, seriesColor, getSubtitle, dataViewId]);

  return charts;
};

const getHostsCharts = async ({
  metric,
  overview,
  schemas = ['ecs'],
}: {
  metric: HostMetricTypes;
  overview?: boolean;
  schemas?: Array<'ecs' | 'semconv'>;
}) => {
  const model = findInventoryModel('host');
  const { cpu, memory, network, disk, logs } = await model.metrics.getCharts({
    schemas,
  });

  switch (metric) {
    case 'cpu':
      return overview
        ? [cpu.xy.cpuUsage, cpu.xy.normalizedLoad1m]
        : [
            cpu.xy.cpuUsage,
            cpu.xy.cpuUsageBreakdown,
            cpu.xy.normalizedLoad1m,
            cpu.xy.loadBreakdown,
          ];
    case 'memory':
      return overview
        ? [memory.xy.memoryUsage]
        : [memory.xy.memoryUsage, memory.xy.memoryUsageBreakdown];
    case 'network':
      return [network.xy.rxTx];
    case 'disk':
      return overview
        ? [disk.xy.diskUsageByMountPoint, disk.xy.diskIOReadWrite]
        : [disk.xy.diskUsageByMountPoint, disk.xy.diskIOReadWrite, disk.xy.diskThroughputReadWrite];
    case 'log':
      return [logs.xy.logRate];
    default:
      return [];
  }
};
