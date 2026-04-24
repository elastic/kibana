/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import type { RemoteMonitorListItem } from '../../../common/runtime_types';
import {
  FINAL_SUMMARY_FILTER,
  getRangeFilter,
  getTimespanFilter,
} from '../../../common/constants/client_defaults';
import { getRemoteMonitorInfo } from '../../lib/remote_result_utils';
import type { SyntheticsEsClient } from '../../lib';

const COMPOSITE_PAGE_SIZE = 500;

interface RemoteMonitorBucket {
  configId: string;
  name: string;
  type: string;
  tags: string[];
  locations: string[];
  index: string;
  kibanaUrl?: string;
  urls?: string;
}

export async function getRemoteMonitorsList({
  syntheticsEsClient,
  localConfigIds,
}: {
  syntheticsEsClient: SyntheticsEsClient;
  localConfigIds: Set<string>;
}): Promise<RemoteMonitorListItem[]> {
  const range = {
    from: moment().subtract(4, 'hours').subtract(20, 'minutes').toISOString(),
    to: 'now',
  };

  const filters: QueryDslQueryContainer[] = [
    FINAL_SUMMARY_FILTER,
    getRangeFilter({ from: range.from, to: range.to }),
    getTimespanFilter({ from: 'now-15m', to: 'now' }),
  ];

  let hasMoreData = true;
  let afterKey: any;
  const remoteMonitorMap = new Map<string, RemoteMonitorBucket>();

  do {
    const result = await syntheticsEsClient.search(
      {
        size: 0,
        query: {
          bool: {
            filter: filters,
          },
        },
        aggs: {
          monitors: {
            composite: {
              size: COMPOSITE_PAGE_SIZE,
              sources: asMutableArray([
                {
                  monitorId: {
                    terms: {
                      field: 'monitor.id',
                    },
                  },
                },
                {
                  locationId: {
                    terms: {
                      field: 'observer.name',
                    },
                  },
                },
              ] as const),
              after: afterKey,
            },
            aggs: {
              status: {
                top_metrics: {
                  metrics: [
                    { field: 'monitor.status' },
                    { field: 'url.full.keyword' },
                    { field: 'kibanaUrl' },
                    { field: 'monitor.name' },
                    { field: 'monitor.type' },
                    { field: 'config_id' },
                    { field: 'tags' },
                  ],
                  sort: {
                    '@timestamp': 'desc',
                  },
                },
              },
              index_name: {
                terms: {
                  field: '_index',
                  size: 1,
                },
              },
            },
          },
        },
      },
      'getRemoteMonitorsList'
    );

    const data = result.body.aggregations?.monitors;
    hasMoreData = (data?.buckets ?? []).length >= COMPOSITE_PAGE_SIZE;
    afterKey = data?.after_key;

    data?.buckets.forEach(({ status: statusAgg, key: bKey, ...rest }) => {
      const monitorId = String(bKey.monitorId);
      const locationId = String(bKey.locationId);
      const metrics = statusAgg.top?.[0]?.metrics;
      if (!metrics) return;

      const indexNameAgg = (rest as any).index_name;
      const indexName = indexNameAgg?.buckets?.[0]?.key;
      if (!indexName) return;

      const remoteInfo = getRemoteMonitorInfo(String(indexName));
      if (!remoteInfo) return;

      const configId = metrics.config_id ? String(metrics.config_id) : monitorId;

      if (localConfigIds.has(configId)) return;

      const existing = remoteMonitorMap.get(configId);
      if (existing) {
        if (!existing.locations.includes(locationId)) {
          existing.locations.push(locationId);
        }
      } else {
        const tags = metrics.tags;
        remoteMonitorMap.set(configId, {
          configId,
          name: metrics['monitor.name'] ? String(metrics['monitor.name']) : monitorId,
          type: metrics['monitor.type'] ? String(metrics['monitor.type']) : 'unknown',
          tags: tags ? (Array.isArray(tags) ? tags.map(String) : [String(tags)]) : [],
          locations: [locationId],
          index: String(indexName),
          kibanaUrl: metrics.kibanaUrl ? String(metrics.kibanaUrl) : undefined,
          urls: metrics['url.full.keyword'] ? String(metrics['url.full.keyword']) : undefined,
        });
      }
    });
  } while (hasMoreData && afterKey);

  return Array.from(remoteMonitorMap.values()).map((bucket) => {
    const remote = getRemoteMonitorInfo(bucket.index, bucket.kibanaUrl);
    return {
      configId: bucket.configId,
      name: bucket.name,
      type: bucket.type,
      remote: remote!,
      tags: bucket.tags,
      locations: bucket.locations,
      enabled: true,
      urls: bucket.urls,
    };
  });
}
