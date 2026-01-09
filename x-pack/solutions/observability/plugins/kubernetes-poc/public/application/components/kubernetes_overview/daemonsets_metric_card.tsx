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

interface DaemonsetsMetricCardProps {
  timeRange: TimeRange;
  height?: number;
}

/**
 * ES|QL query for total daemonset count across all clusters
 */
const DAEMONSETS_ESQL = `FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name IS NOT NULL
  AND k8s.daemonset.name IS NOT NULL
| STATS daemonset_count = COUNT_DISTINCT(k8s.daemonset.name)`;

export const DaemonsetsMetricCard: React.FC<DaemonsetsMetricCardProps> = ({
  timeRange,
  height = 100,
}) => {
  const { plugins } = usePluginContext();
  const LensComponent = plugins.lens.EmbeddableComponent;

  const attributes: TypedLensByValueInput['attributes'] = useMemo(
    () => ({
      title: i18n.translate('xpack.kubernetesPoc.kubernetesOverview.daemonsetsLabel', {
        defaultMessage: 'DaemonSets',
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
          esql: DAEMONSETS_ESQL,
        },
        filters: [],
        datasourceStates: {
          textBased: {
            layers: {
              layer_0: {
                index: 'esql-query-index',
                timeField: '@timestamp',
                query: {
                  esql: DAEMONSETS_ESQL,
                },
                columns: [
                  {
                    columnId: 'metric_0',
                    fieldName: 'daemonset_count',
                    label: i18n.translate(
                      'xpack.kubernetesPoc.kubernetesOverview.daemonsetsLabel',
                      {
                        defaultMessage: 'DaemonSets',
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
      id="daemonsetsMetric"
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
