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

interface ServicesMetricCardProps {
  timeRange: TimeRange;
  height?: number;
}

/**
 * ES|QL query for total service count across all clusters
 * Note: k8s.service.name might not be available in OTel data, using k8s.namespace.name as fallback
 */
const SERVICES_ESQL = `FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name IS NOT NULL
  AND k8s.service.name IS NOT NULL
| STATS service_count = COUNT_DISTINCT(k8s.service.name)`;

export const ServicesMetricCard: React.FC<ServicesMetricCardProps> = ({
  timeRange,
  height = 100,
}) => {
  const { plugins } = usePluginContext();
  const LensComponent = plugins.lens.EmbeddableComponent;

  const attributes: TypedLensByValueInput['attributes'] = useMemo(
    () => ({
      title: i18n.translate('xpack.kubernetesPoc.kubernetesOverview.servicesLabel', {
        defaultMessage: 'Services',
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
          subtitle: i18n.translate('xpack.kubernetesPoc.kubernetesOverview.totalLabel', {
            defaultMessage: 'Total',
          }),
        },
        query: {
          esql: SERVICES_ESQL,
        },
        filters: [],
        datasourceStates: {
          textBased: {
            layers: {
              layer_0: {
                index: 'esql-query-index',
                query: {
                  esql: SERVICES_ESQL,
                },
                columns: [
                  {
                    columnId: 'metric_0',
                    fieldName: 'service_count',
                    label: i18n.translate('xpack.kubernetesPoc.kubernetesOverview.servicesLabel', {
                      defaultMessage: 'Services',
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
      id="servicesMetric"
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
