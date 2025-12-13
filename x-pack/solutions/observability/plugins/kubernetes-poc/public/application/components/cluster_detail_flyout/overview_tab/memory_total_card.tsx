/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { TimeRange } from '@kbn/es-query';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { usePluginContext } from '../../../../hooks/use_plugin_context';

interface MemoryTotalCardProps {
  clusterName: string;
  timeRange: TimeRange;
  height?: number;
}

/**
 * ES|QL query for total allocatable memory across all nodes in the cluster.
 * Sums the maximum allocatable memory per node.
 */
const getMemoryTotalEsql = (clusterName: string) => `FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name == "${clusterName}" 
  AND k8s.node.name IS NOT NULL
  AND k8s.node.allocatable_memory IS NOT NULL
| STATS 
    node_memory = MAX(k8s.node.allocatable_memory)
  BY k8s.node.name
| STATS total_memory_bytes = SUM(node_memory)`;

export const MemoryTotalCard: React.FC<MemoryTotalCardProps> = ({
  clusterName,
  timeRange,
  height = 100,
}) => {
  const { plugins } = usePluginContext();
  const LensComponent = plugins.lens.EmbeddableComponent;

  const esql = useMemo(() => getMemoryTotalEsql(clusterName), [clusterName]);

  const attributes: TypedLensByValueInput['attributes'] = useMemo(
    () => ({
      title: 'Memory',
      description: '',
      visualizationType: 'lnsMetric',
      type: 'lens',
      references: [],
      state: {
        visualization: {
          layerId: 'layer_0',
          layerType: 'data',
          metricAccessor: 'metric_0',
          subtitle: 'Total',
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
                    columnId: 'metric_0',
                    fieldName: 'total_memory_bytes',
                    label: 'Memory',
                    customLabel: true,
                    meta: {
                      type: 'number',
                    },
                    params: {
                      format: {
                        id: 'bytes',
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
    <LensComponent
      id={`memoryTotal-${clusterName}`}
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

