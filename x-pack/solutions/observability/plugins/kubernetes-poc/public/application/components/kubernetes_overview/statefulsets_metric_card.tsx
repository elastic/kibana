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

interface StatefulsetsMetricCardProps {
  timeRange: TimeRange;
  height?: number;
}

/**
 * ES|QL query for total statefulset count across all clusters
 */
const STATEFULSETS_ESQL = `FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name IS NOT NULL
  AND k8s.statefulset.name IS NOT NULL
| STATS statefulset_count = COUNT_DISTINCT(k8s.statefulset.name)`;

export const StatefulsetsMetricCard: React.FC<StatefulsetsMetricCardProps> = ({
  timeRange,
  height = 100,
}) => {
  const { plugins } = usePluginContext();
  const LensComponent = plugins.lens.EmbeddableComponent;

  const attributes: TypedLensByValueInput['attributes'] = useMemo(
    () => ({
      title: i18n.translate('xpack.kubernetesPoc.kubernetesOverview.statefulsetsLabel', {
        defaultMessage: 'StatefulSets',
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
          esql: STATEFULSETS_ESQL,
        },
        filters: [],
        datasourceStates: {
          textBased: {
            layers: {
              layer_0: {
                index: 'esql-query-index',
                timeField: '@timestamp',
                query: {
                  esql: STATEFULSETS_ESQL,
                },
                columns: [
                  {
                    columnId: 'metric_0',
                    fieldName: 'statefulset_count',
                    label: i18n.translate(
                      'xpack.kubernetesPoc.kubernetesOverview.statefulsetsLabel',
                      {
                        defaultMessage: 'StatefulSets',
                      }
                    ),
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
      id="statefulsetsMetric"
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
