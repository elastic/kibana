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
import { usePluginContext } from '../../../hooks/use_plugin_context';

interface VolumeUsageTrendCardProps {
  timeRange: TimeRange;
  height?: number;
}

/**
 * ES|QL query for Volume (filesystem) usage by cluster over time
 * Calculates Volume utilization as a ratio of filesystem usage to capacity
 * Uses TS command with TBUCKET for time series aggregation
 *
 * Performance rules applied:
 * - k8s.cluster.name and k8s.node.name are required (BY clause fields)
 * - k8s.node.filesystem.usage and k8s.node.filesystem.capacity are metric fields (OR condition)
 */
const VOLUME_USAGE_BY_CLUSTER_ESQL = `TS remote_cluster:metrics-*
| WHERE k8s.cluster.name IS NOT NULL
  AND k8s.node.name IS NOT NULL
  AND (k8s.node.filesystem.usage IS NOT NULL OR k8s.node.filesystem.capacity IS NOT NULL)
| STATS 
    sum_filesystem_usage = SUM(k8s.node.filesystem.usage),
    sum_filesystem_capacity = SUM(k8s.node.filesystem.capacity)
  BY timestamp = TBUCKET(1 minute), k8s.cluster.name
| EVAL volume_utilization = sum_filesystem_usage / TO_DOUBLE(sum_filesystem_capacity)
| KEEP timestamp, k8s.cluster.name, volume_utilization`;

/**
 * Card displaying Volume usage by cluster as a line chart using Lens
 */
export const VolumeUsageTrendCard: React.FC<VolumeUsageTrendCardProps> = ({
  timeRange,
  height = 316,
}) => {
  const { plugins } = usePluginContext();
  const LensComponent = plugins.lens.EmbeddableComponent;

  const attributes: TypedLensByValueInput['attributes'] = useMemo(
    () => ({
      title: 'Volume util trend by cluster',
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
              splitAccessor: 'breakdown_0', // Split by cluster name
              seriesType: 'line',
              layerType: 'data',
              palette: {
                name: 'default',
                type: 'palette',
              },
            },
          ],
          legend: {
            isVisible: true,
            position: 'bottom',
          },
          yLeftExtent: {
            mode: 'dataBounds',
          },
          curveType: 'LINEAR',
        },
        query: {
          esql: VOLUME_USAGE_BY_CLUSTER_ESQL,
        },
        filters: [],
        datasourceStates: {
          textBased: {
            layers: {
              layer_0: {
                index: 'esql-query-index',
                timeField: '@timestamp',
                query: {
                  esql: VOLUME_USAGE_BY_CLUSTER_ESQL,
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
                    fieldName: 'volume_utilization',
                    label: 'Volume Utilization',
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
                  {
                    columnId: 'breakdown_0',
                    fieldName: 'k8s.cluster.name',
                    label: 'Cluster',
                    customLabel: true,
                    meta: {
                      type: 'string',
                    },
                  },
                ],
              },
            },
          },
        },
      },
    }),
    []
  );

  return (
    <div style={{ paddingTop: '8px', paddingLeft: '8px' }}>
      <EuiText size="s" style={{ fontWeight: 700 }}>
        {i18n.translate('xpack.kubernetesPoc.clusterOverview.volumeUtilTrendByClusterTitle', {
          defaultMessage: 'Volume util trend by cluster',
        })}
      </EuiText>
      <LensComponent
        id="volumeUsageTrendChart"
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
