/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { TimeRange } from '@kbn/es-query';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { usePluginContext } from '../../../hooks/use_plugin_context';
import { KUBERNETES_POC_LENS_METRIC_COLOR } from '../../constants';

interface ClusterCountCardProps {
  timeRange: TimeRange;
  height?: number;
}

/**
 * ES|QL query for total cluster count with performance-optimized WHERE clause.
 * The OR condition filters to documents that have either node or pod data,
 * avoiding scanning irrelevant metrics documents.
 */
const CLUSTER_COUNT_ESQL = `FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name IS NOT NULL
  AND (
    k8s.node.name IS NOT NULL
    OR k8s.pod.uid IS NOT NULL
  )
| STATS cluster_count = COUNT_DISTINCT(k8s.cluster.name)`;

/**
 * Card displaying total cluster count using a Lens metric visualization
 * with a vertical progress bar where max = cluster_count (always full)
 */
export const ClusterCountCard: React.FC<ClusterCountCardProps> = ({ timeRange, height = 100 }) => {
  const { plugins } = usePluginContext();
  const LensComponent = plugins.lens.EmbeddableComponent;

  const attributes: TypedLensByValueInput['attributes'] = useMemo(
    () => ({
      title: 'Total Clusters',
      description: '',
      visualizationType: 'lnsMetric',
      type: 'lens',
      references: [],
      state: {
        visualization: {
          layerId: 'layer_0',
          layerType: 'data',
          metricAccessor: 'metric_0',
          maxAccessor: 'max_0',
          showBar: true,
          progressDirection: 'vertical',
          color: KUBERNETES_POC_LENS_METRIC_COLOR,
          applyColorTo: 'value',
        },
        query: {
          esql: CLUSTER_COUNT_ESQL,
        },
        filters: [],
        datasourceStates: {
          textBased: {
            layers: {
              layer_0: {
                index: 'esql-query-index',
                timeField: '@timestamp',
                query: {
                  esql: CLUSTER_COUNT_ESQL,
                },
                columns: [
                  {
                    columnId: 'metric_0',
                    fieldName: 'cluster_count',
                    label: 'Total Clusters',
                    customLabel: true,
                    meta: {
                      type: 'number',
                    },
                  },
                  {
                    columnId: 'max_0',
                    fieldName: 'cluster_count',
                    meta: {
                      type: 'number',
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
    <LensComponent
      id="clusterCountMetric"
      attributes={attributes}
      timeRange={timeRange}
      style={{ height: `${height}px`, width: '100%' }}
      viewMode="view"
      noPadding
      withDefaultActions={false}
      disableTriggers
      showInspector={false}
      syncCursor={false}
      syncTooltips={false}
    />
  );
};
