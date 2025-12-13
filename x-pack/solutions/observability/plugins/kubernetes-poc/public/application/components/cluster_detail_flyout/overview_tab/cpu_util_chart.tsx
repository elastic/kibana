/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { TimeRange } from '@kbn/es-query';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { usePluginContext } from '../../../../hooks/use_plugin_context';

interface CpuUtilChartProps {
  clusterName: string;
  timeRange: TimeRange;
  height?: number;
}

/**
 * ES|QL query for CPU utilization percentage over time.
 */
const getCpuUtilEsql = (clusterName: string) => `TS remote_cluster:metrics-*
| WHERE k8s.cluster.name == "${clusterName}" 
  AND k8s.node.name IS NOT NULL
  AND (k8s.node.cpu.usage IS NOT NULL OR k8s.node.allocatable_cpu IS NOT NULL)
| STATS 
    sum_cpu_usage = SUM(k8s.node.cpu.usage),
    sum_allocatable_cpu = SUM(k8s.node.allocatable_cpu)
  BY timestamp = TBUCKET(1 minute)
| EVAL cpu_utilization = sum_cpu_usage / sum_allocatable_cpu
| KEEP timestamp, cpu_utilization`;

export const CpuUtilChart: React.FC<CpuUtilChartProps> = ({
  clusterName,
  timeRange,
  height = 200,
}) => {
  const { plugins } = usePluginContext();
  const LensComponent = plugins.lens.EmbeddableComponent;

  const esql = useMemo(() => getCpuUtilEsql(clusterName), [clusterName]);

  const attributes: TypedLensByValueInput['attributes'] = useMemo(
    () => ({
      title: 'CPU util',
      description: '',
      visualizationType: 'lnsXY',
      type: 'lens',
      references: [],
      state: {
        visualization: {
          layerId: 'layer_0',
          layerType: 'data',
          axisTitlesVisibilitySettings: {
            x: false,
            yLeft: false,
            yRight: false,
          },
          gridlinesVisibilitySettings: {
            x: true,
            yLeft: true,
            yRight: true,
          },
          labelsOrientation: {
            x: 0,
            yLeft: 0,
            yRight: 0,
          },
          tickLabelsVisibilitySettings: {
            x: true,
            yLeft: true,
            yRight: true,
          },
          preferredSeriesType: 'line',
          layers: [
            {
              layerId: 'layer_0',
              accessors: ['metric_0'],
              xAccessor: 'date_0',
              seriesType: 'line',
              layerType: 'data',
              palette: {
                name: 'default',
                type: 'palette',
              },
            },
          ],
          legend: {
            isVisible: false,
          },
          yLeftExtent: {
            mode: 'dataBounds',
          },
          curveType: 'LINEAR',
        },
        query: {
          esql,
        },
        filters: [],
        datasourceStates: {
          textBased: {
            layers: {
              layer_0: {
                index: 'esql-query-index',
                query: {
                  esql,
                },
                columns: [
                  {
                    columnId: 'date_0',
                    fieldName: 'timestamp',
                    meta: {
                      type: 'date',
                    },
                  },
                  {
                    columnId: 'metric_0',
                    fieldName: 'cpu_utilization',
                    label: 'CPU Utilization',
                    customLabel: true,
                    meta: {
                      type: 'number',
                    },
                    params: {
                      format: {
                        id: 'percent',
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },
    }),
    [esql]
  );

  return (
    <div style={{ paddingTop: '8px', paddingLeft: '8px' }}>
      <EuiText size="s" style={{ fontWeight: 700 }}>
        {i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.cpuUtilTitle', {
          defaultMessage: 'CPU util',
        })}
      </EuiText>
      <LensComponent
        id={`cpuUtil-${clusterName}`}
        attributes={attributes}
        timeRange={timeRange}
        style={{ height: `${height - 32}px`, width: '100%' }}
        viewMode="view"
        noPadding
        withDefaultActions={false}
        disableTriggers
        showInspector={false}
        syncCursor={false}
        syncTooltips={false}
      />
    </div>
  );
};

