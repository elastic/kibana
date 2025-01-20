/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery, termsQuery } from '@kbn/observability-plugin/server';
import type { TimeRangeMetadata } from '@kbn/apm-data-access-plugin/common';
import { HOST_NAME_FIELD } from '../../../../../common/constants';
import type { InfraAssetMetadataType } from '../../../../../common/http_api';
import { METADATA_AGGREGATION_NAME } from '../constants';
import type { GetHostParameters } from '../types';
import {
  getFilterByIntegration,
  getInventoryModelAggregations,
  getDocumentsFilter,
} from '../helpers/query';
import { BasicMetricValueRT } from '../../../../lib/metrics/types';

export const getAllHosts = async ({
  infraMetricsClient,
  apmDocumentSources,
  from,
  to,
  limit,
  metrics,
  hostNames,
  apmDataAccessServices,
}: Pick<
  GetHostParameters,
  'infraMetricsClient' | 'apmDataAccessServices' | 'from' | 'to' | 'limit' | 'metrics'
> & {
  hostNames: string[];
  apmDocumentSources?: TimeRangeMetadata['sources'];
}) => {
  const metricAggregations = getInventoryModelAggregations(
    'host',
    metrics.map((metric) => metric)
  );

  const documentsFilter = await getDocumentsFilter({
    apmDataAccessServices,
    apmDocumentSources,
    from,
    to,
  });

  const response = await infraMetricsClient.search({
    allow_no_indices: true,
    ignore_unavailable: true,
    body: {
      size: 0,
      track_total_hits: false,
      query: {
        bool: {
          filter: [...termsQuery(HOST_NAME_FIELD, ...hostNames), ...rangeQuery(from, to)],
          should: [...documentsFilter],
        },
      },
      aggs: {
        // find hosts with metrics that are monitored by the system integration.
        monitoredHosts: {
          filter: getFilterByIntegration('system'),
          aggs: {
            names: {
              terms: {
                field: HOST_NAME_FIELD,
                size: limit,
                order: {
                  _key: 'asc',
                },
              },
            },
          },
        },
        allHostMetrics: {
          terms: {
            field: HOST_NAME_FIELD,
            size: limit,
            order: {
              _key: 'asc',
            },
          },
          aggs: {
            ...metricAggregations,
            [METADATA_AGGREGATION_NAME]: {
              top_metrics: {
                metrics: [
                  {
                    field: 'host.os.name',
                  },
                  {
                    field: 'cloud.provider',
                  },
                  {
                    field: 'host.ip',
                  },
                ],
                size: 1,
                sort: {
                  '@timestamp': 'desc',
                },
              },
            },
          },
        },
      },
    },
  });

  const systemIntegrationHosts = new Set(
    response.aggregations?.monitoredHosts.names.buckets.map((p) => p.key) ?? []
  );

  const result = (response.aggregations?.allHostMetrics.buckets ?? [])
    .sort((a, b) => {
      const hasASystemMetrics = systemIntegrationHosts.has(a?.key as string);
      const hasBSystemMetrics = systemIntegrationHosts.has(b?.key as string);

      if (hasASystemMetrics !== hasBSystemMetrics) {
        return hasASystemMetrics ? -1 : 1;
      }

      const aValue = getMetricValue(a?.cpuV2) ?? 0;
      const bValue = getMetricValue(b?.cpuV2) ?? 0;

      return bValue - aValue;
    })
    .map((bucket) => {
      const hostName = bucket.key as string;
      const metadata = (bucket?.metadata.top ?? [])
        .flatMap((top) => Object.entries(top.metrics))
        .map(([key, value]) => ({
          name: key as InfraAssetMetadataType,
          value: typeof value === 'string' && value.trim().length === 0 ? null : value,
        }));

      return {
        name: hostName,
        metadata,
        metrics: metrics.map((metric) => ({
          name: metric,
          value: getMetricValue(bucket[metric]) || null,
        })),
        hasSystemMetrics: systemIntegrationHosts.has(hostName),
      };
    });

  return result;
};

const getMetricValue = (valueObject: unknown): number | null => {
  if (BasicMetricValueRT.is(valueObject)) {
    return valueObject.value;
  }

  return valueObject as number | null;
};
