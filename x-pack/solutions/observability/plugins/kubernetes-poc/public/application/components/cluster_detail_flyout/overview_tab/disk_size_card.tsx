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
import { KUBERNETES_POC_LENS_METRIC_COLOR } from '../../../constants';

interface DiskSizeCardProps {
  clusterName: string;
  timeRange: TimeRange;
  height?: number;
}

/**
 * ES|QL query for total disk capacity across all nodes in the cluster.
 * Sums the maximum filesystem capacity per node.
 */
const getDiskSizeEsql = (clusterName: string) => `FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name == "${clusterName}" 
  AND k8s.node.name IS NOT NULL
  AND k8s.node.filesystem.capacity IS NOT NULL
| STATS 
    disk_capacity = MAX(k8s.node.filesystem.capacity)
  BY k8s.node.name
| STATS total_disk_bytes = SUM(disk_capacity)`;

export const DiskSizeCard: React.FC<DiskSizeCardProps> = ({
  clusterName,
  timeRange,
  height = 100,
}) => {
  const { plugins } = usePluginContext();
  const LensComponent = plugins.lens.EmbeddableComponent;

  const query = useMemo(() => getDiskSizeEsql(clusterName), [clusterName]);

  const attributes: TypedLensByValueInput['attributes'] = useMemo(
    () => ({
      title: i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.diskSizeLabel', {
        defaultMessage: 'Disk size',
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
          color: KUBERNETES_POC_LENS_METRIC_COLOR,
          applyColorTo: 'value',
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
                timeField: '@timestamp',
                query: {
                  esql: query,
                },
                columns: [
                  {
                    columnId: 'metric_0',
                    fieldName: 'total_disk_bytes',
                    label: i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.diskSizeLabel', {
                      defaultMessage: 'Disk size',
                    }),
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
    [query]
  );

  return (
    <LensComponent
      id="diskSizeMetric"
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
