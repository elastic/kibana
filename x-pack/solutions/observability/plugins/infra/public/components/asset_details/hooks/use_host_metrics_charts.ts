/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';
import { findInventoryModel } from '@kbn/metrics-data-access-plugin/common';
import useAsync from 'react-use/lib/useAsync';
import type { HostMetricTypes } from '../charts/types';
import { useChartSeriesColor } from './use_chart_series_color';

export const useHostCharts = ({
  metric,
  dataViewId,
  overview,
  schema,
}: {
  metric: HostMetricTypes;
  dataViewId?: string;
  overview?: boolean;
  schema?: DataSchemaFormat | null;
}) => {
  const { value: charts = [], error } = useAsync(async () => {
    const hostCharts = await getHostsCharts({
      metric,
      overview,
      schema: schema ?? 'ecs',
    });

    return hostCharts.map((chart) => ({
      ...chart,
      ...(dataViewId && {
        dataset: {
          index: dataViewId,
        },
      }),
    }));
  }, [dataViewId, metric, overview, schema]);

  return { charts, error };
};

export const useKubernetesCharts = ({
  dataViewId,
  overview,
}: {
  dataViewId?: string;
  overview?: boolean;
}) => {
  const model = findInventoryModel('host');

  const { value: charts = [], error } = useAsync(async () => {
    const { kubernetesNode } = await model.metrics.getCharts();

    if (!kubernetesNode) {
      return [];
    }

    const items = overview
      ? [kubernetesNode.xy.nodeCpuCapacity, kubernetesNode.xy.nodeMemoryCapacity]
      : [
          kubernetesNode.xy.nodeCpuCapacity,
          kubernetesNode.xy.nodeMemoryCapacity,
          kubernetesNode.xy.nodeDiskCapacity,
          kubernetesNode.xy.nodePodCapacity,
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
  }, [model.metrics, overview, dataViewId]);

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
  schema,
}: {
  dataViewId?: string;
  seriesColor?: string;
  getSubtitle?: (formulaValue: string) => string;
  schema?: DataSchemaFormat | null;
}) => {
  seriesColor = useChartSeriesColor(seriesColor);

  const { value: charts = [] } = useAsync(async () => {
    const model = findInventoryModel('host');
    const { cpu, memory, disk } = await model.metrics.getCharts({
      schema: schema ?? 'ecs',
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
  }, [dataViewId, seriesColor, getSubtitle, schema]);

  return charts;
};

const getHostsCharts = async ({
  metric,
  overview,
  schema,
}: {
  metric: HostMetricTypes;
  overview?: boolean;
  schema?: DataSchemaFormat | null;
}) => {
  const model = findInventoryModel('host');

  const { cpu, memory, network, disk, logs } = await model.metrics.getCharts({
    schema: schema ?? 'ecs',
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
