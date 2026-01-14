/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { TimeRange } from '@kbn/es-query';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { i18n } from '@kbn/i18n';
import { usePluginContext } from '../../../hooks/use_plugin_context';
import { KUBERNETES_POC_LENS_METRIC_COLOR } from '../../constants';

interface NodesMetricCardProps {
  timeRange: TimeRange;
  height?: number;
}

/**
 * ES|QL query for total node count across all clusters
 */
const NODES_ESQL = `FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name IS NOT NULL
  AND k8s.node.name IS NOT NULL
| STATS total_nodes = COUNT_DISTINCT(k8s.node.name)`;

export const NodesMetricCard: React.FC<NodesMetricCardProps> = ({ timeRange, height = 100 }) => {
  const { plugins } = usePluginContext();
  const LensComponent = plugins.lens.EmbeddableComponent;

  const attributes: TypedLensByValueInput['attributes'] = useMemo(
    () => ({
      title: i18n.translate('xpack.kubernetesPoc.kubernetesOverview.nodesLabel', {
        defaultMessage: 'Nodes',
      }),
      description: '',
      visualizationType: 'lnsMetric',
      type: 'lens',
      references: [],
      state: {
        visualization: {
          layerId: 'layer_0',
          layerType: 'data',
          metricAccessor: 'metric_0',
          color: KUBERNETES_POC_LENS_METRIC_COLOR,
          applyColorTo: 'value',
        },
        query: {
          esql: NODES_ESQL,
        },
        filters: [],
        datasourceStates: {
          textBased: {
            layers: {
              layer_0: {
                index: 'esql-query-index',
                timeField: '@timestamp',
                query: {
                  esql: NODES_ESQL,
                },
                columns: [
                  {
                    columnId: 'metric_0',
                    fieldName: 'total_nodes',
                    label: i18n.translate('xpack.kubernetesPoc.kubernetesOverview.nodesLabel', {
                      defaultMessage: 'Nodes',
                    }),
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
      id="nodesMetric"
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
