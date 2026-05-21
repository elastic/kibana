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
import { DEFAULT_SCHEMA, HOST_NAME_FIELD } from '../../../../../common/constants';
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
  schema = DEFAULT_SCHEMA,
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

  const response = await infraMetricsClient.search(
    {
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
        // Aggregation to find hosts whose metrics are monitored by the system integration.
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
            // P3 — kept as-is by design.
            //
            // The intuitive optimisation (`terms(size: 1)`) is materially
            // cheaper but returns the *most-frequent* value within the
            // window, which is wrong whenever the host's metadata changed
            // mid-window (e.g. cloud migration, IP rotation) — the user
            // expects the *latest* value, especially because metadata
            // exclusion filters (`cloud.provider != aws`) compare against
            // this materialised value. The "best of both worlds" candidate
            // `terms(size:1, order: { latest_ts: desc }) > max(@timestamp)`
            // was tested empirically and came out ~10 % slower than the
            // current shape at 24h / 500 hosts (response size grows ~50 %
            // because every bucket carries the ordering sub-agg). See
            // PROPOSALS.md §P3 and REPORT.md for the full ablation table.
            //
            // The shape — `filter:{exists} > top_metrics(latest, size:1)` —
            // preserves the "latest non-null value of the field" semantic
            // that every consumer of the `metadata[]` array depends on,
            // including the post-fetch exclusion filter in `getHosts`. The
            // `filter` wrapper handles the legacy edge case where the most
            // recent sample lacks the metadata field but older samples have
            // it: it restricts to docs that have it, then `top_metrics`
            // picks the latest among those.
            //
            // Phase B is bounded by `limit` (today: 500), so this shape pays
            // O(limit × 3) `top_metrics` evaluations. P12 (page-bounded
            // metadata fetch) collapses that to O(20 × 3) by running the
            // metadata aggs only for the visible page; once P12 lands, this
            // shape's cost drops by ~25× without any semantic compromise.
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
    },
    'get all hosts'
  );

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
