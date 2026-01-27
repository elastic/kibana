/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { identity } from 'lodash';
import { networkTraffic, findInventoryModel } from '@kbn/metrics-data-access-plugin/common';
import type { MetricsAPIMetric } from '@kbn/metrics-data-access-plugin/common/http_api/metrics_api';
import { type SnapshotRequest, SnapshotCustomMetricInputRT } from '../../../../common/http_api';

export const transformSnapshotMetricsToMetricsAPIMetrics = async (
  snapshotRequest: SnapshotRequest
): Promise<MetricsAPIMetric[]> => {
  const inventoryModel = findInventoryModel(snapshotRequest.nodeType);
  const aggregations = await inventoryModel.metrics.getAggregations({
    schema: snapshotRequest.schema,
  });

  return snapshotRequest.metrics
    .map((metric, index) => {
      const aggregation = aggregations.get(metric.type);

      if (SnapshotCustomMetricInputRT.is(metric)) {
        const isUniqueId = snapshotRequest.metrics.findIndex((m) =>
          SnapshotCustomMetricInputRT.is(m) ? m.id === metric.id : false
        );
        const customId = isUniqueId ? metric.id : `custom_${index}`;

        if (metric.aggregation === 'rate') {
          return { id: customId, aggregations: networkTraffic(customId, metric.field) };
        } else if (metric.aggregation === 'last_value') {
          return {
            id: customId,
            aggregations: {
              [customId]: {
                filter: {
                  exists: { field: metric.field },
                },
                aggs: {
                  value: {
                    top_metrics: {
                      metrics: { field: metric.field },
                      size: 1,
                      sort: { '@timestamp': 'desc' },
                    },
                  },
                },
              },
            },
          };
        } else {
          return {
            id: customId,
            aggregations: {
              [customId]: {
                [metric.aggregation]: {
                  field: metric.field,
                },
              },
            },
          };
        }
      }
      return { id: metric.type, aggregations: aggregation };
    })
    .filter(identity) as MetricsAPIMetric[];
};
