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
import { usePluginContext } from '../../../../hooks/use_plugin_context';

interface NamespacesCardProps {
  clusterName: string;
  timeRange: TimeRange;
  height?: number;
}

/**
 * ES|QL query for total number of namespaces in the cluster.
 */
const getNamespacesEsql = (clusterName: string) => `FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name == "${clusterName}" 
  AND k8s.namespace.name IS NOT NULL
| STATS namespace_count = COUNT_DISTINCT(k8s.namespace.name)`;

export const NamespacesCard: React.FC<NamespacesCardProps> = ({
  clusterName,
  timeRange,
  height = 100,
}) => {
  const { plugins } = usePluginContext();
  const LensComponent = plugins.lens.EmbeddableComponent;

  const query = useMemo(() => getNamespacesEsql(clusterName), [clusterName]);

  const attributes: TypedLensByValueInput['attributes'] = useMemo(
    () => ({
      title: i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.namespacesLabel', {
        defaultMessage: 'Namespaces',
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
          subtitle: i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.totalLabel', {
            defaultMessage: 'Total',
          }),
        },
        query: {
          esql: query,
        },
        filters: [],
        datasourceStates: {
          textBased: {
            layers: {
              layer_0: {
                index: 'esql-query-index',
                query: {
                  esql: query,
                },
                columns: [
                  {
                    columnId: 'metric_0',
                    fieldName: 'namespace_count',
                    label: i18n.translate(
                      'xpack.kubernetesPoc.clusterDetailFlyout.namespacesLabel',
                      {
                        defaultMessage: 'Namespaces',
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
    [query]
  );

  return (
    <LensComponent
      id="namespacesMetric"
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
