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

interface DeploymentsMetricCardProps {
  timeRange: TimeRange;
  height?: number;
}

/**
 * ES|QL query for total deployment count across all clusters
 */
const DEPLOYMENTS_ESQL = `FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name IS NOT NULL
  AND k8s.deployment.name IS NOT NULL
| STATS deployment_count = COUNT_DISTINCT(k8s.deployment.name)`;

export const DeploymentsMetricCard: React.FC<DeploymentsMetricCardProps> = ({
  timeRange,
  height = 100,
}) => {
  const { plugins } = usePluginContext();
  const LensComponent = plugins.lens.EmbeddableComponent;

  const attributes: TypedLensByValueInput['attributes'] = useMemo(
    () => ({
      title: i18n.translate('xpack.kubernetesPoc.kubernetesOverview.deploymentsLabel', {
        defaultMessage: 'Deployments',
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
          esql: DEPLOYMENTS_ESQL,
        },
        filters: [],
        datasourceStates: {
          textBased: {
            layers: {
              layer_0: {
                index: 'esql-query-index',
                timeField: '@timestamp',
                query: {
                  esql: DEPLOYMENTS_ESQL,
                },
                columns: [
                  {
                    columnId: 'metric_0',
                    fieldName: 'deployment_count',
                    label: i18n.translate(
                      'xpack.kubernetesPoc.kubernetesOverview.deploymentsLabel',
                      {
                        defaultMessage: 'Deployments',
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
      id="deploymentsMetric"
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
