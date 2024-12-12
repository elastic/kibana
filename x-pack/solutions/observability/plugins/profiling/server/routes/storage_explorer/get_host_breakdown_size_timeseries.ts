/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery, termQuery } from '@kbn/observability-plugin/server';
import { ProfilingESField } from '@kbn/profiling-utils';
import { computeBucketWidthFromTimeRangeAndBucketCount } from '../../../common/histogram';
import {
  IndexLifecyclePhaseSelectOption,
  indexLifeCyclePhaseToDataTier,
  StorageExplorerHostDetailsTimeseries,
} from '../../../common/storage_explorer';
import { ProfilingESClient } from '../../utils/create_profiling_es_client';
import { getEstimatedSizeForDocumentsInIndex } from './get_daily_data_generation.size';
import { allIndices, getIndicesStats } from './get_indices_stats';
import { getProfilingHostsDetailsById } from './get_profiling_hosts_details_by_id';

export async function getHostBreakdownSizeTimeseries({
  client,
  timeFrom,
  timeTo,
  kuery,
  indexLifecyclePhase,
}: {
  client: ProfilingESClient;
  timeFrom: number;
  timeTo: number;
  kuery: string;
  indexLifecyclePhase: IndexLifecyclePhaseSelectOption;
}): Promise<StorageExplorerHostDetailsTimeseries[]> {
  const bucketWidth = computeBucketWidthFromTimeRangeAndBucketCount(timeFrom, timeTo, 50);

  const [{ indices: allIndicesStats }, response] = await Promise.all([
    getIndicesStats({ client: client.getEsClient(), indices: allIndices }),
    client.search('profiling_events_metrics_size', {
      index: ['profiling-events-*', 'profiling-metrics'],
      body: {
        query: {
          bool: {
            filter: [
              ...kqlQuery(kuery),
              {
                range: {
                  [ProfilingESField.Timestamp]: {
                    gte: String(timeFrom),
                    lt: String(timeTo),
                    format: 'epoch_second',
                  },
                },
              },
              ...(indexLifecyclePhase !== IndexLifecyclePhaseSelectOption.All
                ? termQuery('_tier', indexLifeCyclePhaseToDataTier[indexLifecyclePhase])
                : []),
            ],
          },
        },
        aggs: {
          hosts: {
            terms: {
              field: ProfilingESField.HostID,
            },
            aggs: {
              storageTimeseries: {
                date_histogram: {
                  field: ProfilingESField.Timestamp,
                  fixed_interval: `${bucketWidth}s`,
                },
                aggs: {
                  indices: {
                    terms: {
                      field: '_index',
                      size: 500,
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  const hostIds = response.aggregations?.hosts.buckets.map((bucket) => bucket.key as string);
  const hostsDetailsMap = hostIds
    ? await getProfilingHostsDetailsById({ client, timeFrom, timeTo, kuery, hostIds })
    : {};

  return (
    response.aggregations?.hosts.buckets.map((bucket) => {
      const hostId = bucket.key as string;
      const hostDetails = hostsDetailsMap[hostId];
      const timeseries = bucket.storageTimeseries.buckets.map((dateHistogramBucket) => {
        const estimatedSize = allIndicesStats
          ? dateHistogramBucket.indices.buckets.reduce((prev, curr) => {
              return (
                prev +
                getEstimatedSizeForDocumentsInIndex({
                  allIndicesStats,
                  indexName: curr.key as string,
                  numberOfDocs: curr.doc_count,
                })
              );
            }, 0)
          : 0;

        return {
          x: dateHistogramBucket.key,
          y: estimatedSize,
        };
      });

      return {
        hostId,
        hostName: hostDetails?.hostName || '',
        timeseries,
      };
    }) || []
  );
}
