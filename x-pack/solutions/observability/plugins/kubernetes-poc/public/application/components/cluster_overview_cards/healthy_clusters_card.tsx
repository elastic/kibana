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

interface HealthyClustersCardProps {
  timeRange: TimeRange;
  height?: number;
}

/**
 * ES|QL query that returns both healthy_count and total_count
 * so we can use total as the max value for the progress bar.
 *
 * Performance rules applied:
 * - k8s.cluster.name and k8s.node.name are required (BY clause fields)
 * - k8s.node.condition_ready is required for the health calculation
 */
const HEALTHY_CLUSTERS_ESQL = `FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name IS NOT NULL
  AND k8s.node.name IS NOT NULL
  AND k8s.node.condition_ready IS NOT NULL
| STATS 
    total_nodes = COUNT_DISTINCT(k8s.node.name),
    ready_nodes = COUNT_DISTINCT(k8s.node.name) WHERE k8s.node.condition_ready > 0
  BY k8s.cluster.name
| EVAL health_status = CASE(ready_nodes < total_nodes, "unhealthy", "healthy")
| STATS 
    healthy_count = COUNT(*) WHERE health_status == "healthy",
    total_count = COUNT(*)`;

/**
 * Card displaying healthy cluster count with a vertical progress bar
 * where max = total cluster count
 */
export const HealthyClustersCard: React.FC<HealthyClustersCardProps> = ({
  timeRange,
  height = 100,
}) => {
  const { plugins } = usePluginContext();
  const LensComponent = plugins.lens.EmbeddableComponent;

  const attributes: TypedLensByValueInput['attributes'] = useMemo(
    () => ({
      title: 'Healthy Clusters',
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
          color: '#00BFB3', // Green/teal for healthy
          applyColorTo: 'value',
        },
        query: {
          esql: HEALTHY_CLUSTERS_ESQL,
        },
        filters: [],
        datasourceStates: {
          textBased: {
            layers: {
              layer_0: {
                index: 'esql-query-index',
                timeField: '@timestamp',
                query: {
                  esql: HEALTHY_CLUSTERS_ESQL,
                },
                columns: [
                  {
                    columnId: 'metric_0',
                    fieldName: 'healthy_count',
                    label: 'Healthy Clusters',
                    customLabel: true,
                    meta: {
                      type: 'number',
                    },
                  },
                  {
                    columnId: 'max_0',
                    fieldName: 'total_count',
                    label: 'Total Clusters',
                    customLabel: true,
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
      id="healthyClustersMetric"
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
