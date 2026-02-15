/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreSetup, KibanaRequest, Logger } from '@kbn/core/server';
import type { ChangePointType } from '@kbn/es-types/src';
import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/types';
import { intervalToSeconds } from '@kbn/apm-data-access-plugin/common/utils/get_preferred_bucket_size_and_data_source';
import type {
  ObservabilityAgentBuilderPluginSetupDependencies,
  ObservabilityAgentBuilderPluginStart,
  ObservabilityAgentBuilderPluginStartDependencies,
} from '../../types';
import { timeRangeFilter, kqlFilter as buildKqlFilter } from '../../utils/dsl_filters';
import { parseDatemath } from '../../utils/time';
import { buildApmResources } from '../../utils/build_apm_resources';
import { getPreferredDocumentSource } from '../../utils/get_preferred_document_source';
import type { ChangePointDetails } from '../../utils/get_change_points';
import {
  type LatencyAggregationType,
  type DocumentType,
  getLatencyAggregation,
  getLatencyValue,
  getFailureRateAggregation,
  getThroughputAggregation,
} from '../../utils/trace_metrics_aggregations';

interface Bucket {
  key: string | number;
  key_as_string?: string;
  doc_count: number;
}

interface ChangePointResult {
  type: Record<ChangePointType, ChangePointDetails>;
  bucket?: Bucket;
}

interface BucketChangePoints extends Bucket {
  changes_latency: ChangePointResult;
  changes_throughput: ChangePointResult;
  changes_failure_rate: ChangePointResult;
  latency_type: LatencyAggregationType;
  time_series: Array<{
    group: string;
    latency: number | null;
    throughput: number | null;
    failure_rate: number | null;
  }>;
}

function getChangePointsAggs(bucketsPath: string) {
  const changePointAggs = {
    change_point: {
      buckets_path: bucketsPath,
    },
    // elasticsearch@9.0.0 change_point aggregation is missing in the types: https://github.com/elastic/elasticsearch-specification/issues/3671
  } as AggregationsAggregationContainer;
  return changePointAggs;
}

export async function getToolHandler({
  core,
  plugins,
  request,
  logger,
  start,
  end,
  kqlFilter,
  groupBy,
  latencyType = 'avg',
}: {
  core: CoreSetup<
    ObservabilityAgentBuilderPluginStartDependencies,
    ObservabilityAgentBuilderPluginStart
  >;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  request: KibanaRequest;
  logger: Logger;
  start: string;
  end: string;
  kqlFilter?: string;
  groupBy: string;
  latencyType: LatencyAggregationType | undefined;
}): Promise<BucketChangePoints[]> {
  const { apmEventClient, apmDataAccessServices } = await buildApmResources({
    core,
    plugins,
    request,
    logger,
  });

  const startMs = parseDatemath(start);
  const endMs = parseDatemath(end);
  const source = await getPreferredDocumentSource({
    apmDataAccessServices,
    start: startMs,
    end: endMs,
    groupBy,
    kqlFilter,
  });

  const { rollupInterval, hasDurationSummaryField } = source;
  const documentType = source.documentType as DocumentType;
  const bucketSizeInSeconds = intervalToSeconds(rollupInterval);

  const response = await apmEventClient.search('get_trace_change_points', {
    apm: {
      sources: [{ documentType, rollupInterval }],
    },
    size: 0,
    track_total_hits: false,
    query: {
      bool: {
        filter: [
          ...timeRangeFilter('@timestamp', {
            start: startMs,
            end: endMs,
          }),
          ...buildKqlFilter(kqlFilter),
        ],
      },
    },
    aggs: {
      groups: {
        terms: {
          field: groupBy,
        },
        aggs: {
          time_series: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: `${bucketSizeInSeconds}s`,
            },
            aggs: {
              ...getLatencyAggregation({
                latencyAggregationType: latencyType,
                hasDurationSummaryField,
                documentType,
              }),
              ...getFailureRateAggregation(documentType),
              ...getThroughputAggregation(bucketSizeInSeconds / 60),
            },
          },
          changes_latency: getChangePointsAggs('time_series>latency'),
          changes_throughput: getChangePointsAggs('time_series>throughput'),
          changes_failure_rate: getChangePointsAggs('time_series>failure_rate'),
        },
      },
    },
  });

  const buckets = response.aggregations?.groups?.buckets ?? [];

  const changePoints = buckets.map((bucket) => {
    const timeSeries = bucket.time_series.buckets.map((tsBucket) => {
      return {
        group: bucket.key as string,
        latency: getLatencyValue({
          latencyAggregationType: latencyType,
          aggregation: tsBucket.latency,
        }),
        throughput: tsBucket.throughput.value,
        failure_rate: tsBucket.failure_rate ? tsBucket.failure_rate.value : null,
      };
    });
    return {
      ...bucket,
      time_series: timeSeries,
      latency_type: latencyType,
    };
  });

  return changePoints as BucketChangePoints[];
}
