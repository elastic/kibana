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

interface PodsUtilChartProps {
  clusterName: string;
  timeRange: TimeRange;
  height?: number;
}

/**
 * ES|QL query for pod utilization percentage over time.
 * Uses FROM instead of TS because COUNT_DISTINCT on keyword fields is not supported in time series mode.
 * Uses fallback of 110 pods/node (Kubernetes default) since k8s.node.allocatable_pods is not available.
 */
const getPodsUtilEsql = (clusterName: string) => `FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name == "${clusterName}" 
  AND k8s.pod.uid IS NOT NULL
  AND k8s.pod.phase IS NOT NULL
| STATS 
    pod_count = COUNT_DISTINCT(k8s.pod.uid),
    node_count = COUNT_DISTINCT(k8s.node.name)
  BY timestamp = BUCKET(@timestamp, 1 minute)
| EVAL max_pods = node_count * 110
| EVAL pod_utilization = TO_DOUBLE(pod_count) / TO_DOUBLE(max_pods)
| KEEP timestamp, pod_utilization`;

export const PodsUtilChart: React.FC<PodsUtilChartProps> = ({
  clusterName,
  timeRange,
  height = 200,
}) => {
  const { plugins } = usePluginContext();
  const LensComponent = plugins.lens.EmbeddableComponent;

  const esql = useMemo(() => getPodsUtilEsql(clusterName), [clusterName]);

  const attributes: TypedLensByValueInput['attributes'] = useMemo(
    () => ({
      title: 'Pods util',
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
                    fieldName: 'pod_utilization',
                    label: 'Pod Utilization',
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
        {i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.podsUtilTitle', {
          defaultMessage: 'Pods util',
        })}
      </EuiText>
      <LensComponent
        id={`podsUtil-${clusterName}`}
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

