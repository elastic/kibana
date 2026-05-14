/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { termQuery } from '@kbn/observability-plugin/server';
import { ApmDocumentType, RollupInterval } from '@kbn/apm-data-access-plugin/common';
import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
import { SPAN_DESTINATION_SERVICE_RESOURCE } from '@kbn/apm-types/es_fields';
import { fetchSeries } from './fetch_timeseries';

export async function getExitSpanThroughput({
  apmEventClient,
  start,
  end,
  intervalString,
  bucketSize,
  filter,
  spanDestinationServiceResource,
}: {
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  intervalString: string;
  bucketSize: number;
  filter: QueryDslQueryContainer[];
  spanDestinationServiceResource?: string;
}) {
  const bucketSizeInMinutes = bucketSize / 60;
  const rangeInMinutes = (end - start) / 1000 / 60;

  return (
    await fetchSeries({
      apmEventClient,
      start,
      end,
      operationName: 'assistant_get_exit_span_throughput',
      unit: 'rpm',
      documentType: ApmDocumentType.ServiceDestinationMetric,
      rollupInterval: RollupInterval.OneMinute,
      intervalString,
      filter: filter.concat(
        ...termQuery(SPAN_DESTINATION_SERVICE_RESOURCE, spanDestinationServiceResource)
      ),
      groupByFields: [SPAN_DESTINATION_SERVICE_RESOURCE],
      aggs: {
        value: {
          bucket_script: {
            buckets_path: {
              count: '_count',
            },
            script: {
              lang: 'painless',
              params: {
                bucketSizeInMinutes,
              },
              source: 'params.count / params.bucketSizeInMinutes',
            },
          },
        },
      },
    })
  ).map((fetchedSerie) => {
    return {
      ...fetchedSerie,
      value:
        fetchedSerie.value !== null
          ? (fetchedSerie.value * bucketSizeInMinutes) / rangeInMinutes
          : null,
      data: fetchedSerie.data.map((bucket) => {
        return {
          x: bucket.key,
          y: bucket.value?.value as number,
        };
      }),
    };
  });
}
