/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery, termsQuery } from '@kbn/observability-plugin/server';
import type { TimeRangeMetadata } from '@kbn/apm-data-access-plugin/common';
import { BasicMetricValueRT } from '@kbn/metrics-data-access-plugin/server';
import { findInventoryModel } from '@kbn/metrics-data-access-plugin/common';
import { HOST_NAME_FIELD } from '../../../../../common/constants';
import type { InfraEntityMetadataType } from '../../../../../common/http_api';
import type { GetHostParameters } from '../types';
import { getInventoryModelAggregations, getDocumentsFilter } from '../helpers/query';

export const getAllHosts = async ({
  infraMetricsClient,
  apmDocumentSources,
  from,
  to,
  limit,
  metrics,
  hostNames,
  apmDataAccessServices,
  schema = 'ecs',
}: Pick<
  GetHostParameters,
  'infraMetricsClient' | 'apmDataAccessServices' | 'from' | 'to' | 'limit' | 'metrics' | 'schema'
> & {
  hostNames: string[];
  apmDocumentSources?: TimeRangeMetadata['sources'];
}) => {
  const inventoryModel = findInventoryModel('host');

  const metricAggregations = await getInventoryModelAggregations(
    'host',
    metrics.map((metric) => metric),
    schema
  );

  const documentsFilter = await getDocumentsFilter({
    apmDataAccessServices,
    apmDocumentSources,
    from,
    to,
    schema,
  });

  const response = await infraMetricsClient.search({
    allow_no_indices: true,
    ignore_unavailable: true,
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
        filter: { bool: { filter: [...(inventoryModel.nodeFilter?.({ schema }) ?? [])] } },
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
          hostOsName: {
            filter: {
              exists: {
                field: 'host.os.name',
              },
            },
            aggs: {
              latest: {
                top_metrics: {
                  metrics: [
                    {
                      field: 'host.os.name',
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
          cloudProvider: {
            filter: {
              exists: {
                field: 'cloud.provider',
              },
            },
            aggs: {
              latest: {
                top_metrics: {
                  metrics: [
                    {
                      field: 'cloud.provider',
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
          hostIp: {
            filter: {
              exists: {
                field: 'host.ip',
              },
            },
            aggs: {
              latest: {
                top_metrics: {
                  metrics: [
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

      const hostOsNameValue = bucket?.hostOsName?.latest?.top?.[0]?.metrics?.['host.os.name'];
      const hostOsNameMetadata = [
        {
          name: 'host.os.name' as InfraEntityMetadataType,
          value: hostOsNameValue ?? null,
        },
      ];

      const cloudProviderValue =
        bucket?.cloudProvider?.latest?.top?.[0]?.metrics?.['cloud.provider'];
      const cloudProviderMetadata = [
        {
          name: 'cloud.provider' as InfraEntityMetadataType,
          value: cloudProviderValue ?? null,
        },
      ];

      const hostIpValue = bucket?.hostIp?.latest?.top?.[0]?.metrics?.['host.ip'];
      const hostIpMetadata = [
        {
          name: 'host.ip' as InfraEntityMetadataType,
          value: hostIpValue ?? null,
        },
      ];

      const metadata = [...hostOsNameMetadata, ...cloudProviderMetadata, ...hostIpMetadata];

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
