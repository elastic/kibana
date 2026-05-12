/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreSetup, KibanaRequest, Logger } from '@kbn/core/server';
import { ApmDocumentType } from '@kbn/apm-data-access-plugin/common';
import type { ChangePointType } from '@kbn/es-types/src';
import {
  getPreferredBucketSizeAndDataSource,
  getBucketSize,
  RollupInterval,
  type TimeRangeMetadata,
} from '@kbn/apm-data-access-plugin/common';
import { intervalToSeconds } from '@kbn/apm-data-access-plugin/common/utils/get_preferred_bucket_size_and_data_source';
import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
import { getDocumentTypesInfo } from '@kbn/apm-data-access-plugin/server/services/get_document_sources';
import { SPAN_DESTINATION_SERVICE_RESOURCE } from '@kbn/apm-types/es_fields';
import type {
  ObservabilityAgentBuilderPluginSetupDependencies,
  ObservabilityAgentBuilderPluginStart,
  ObservabilityAgentBuilderPluginStartDependencies,
} from '../../types';
import { timeRangeFilter, kqlFilter as buildKqlFilter } from '../../utils/dsl_filters';
import { parseDatemath } from '../../utils/time';
import { buildApmResources } from '../../utils/build_apm_resources';
import type { ChangePointDetails } from '../../utils/get_change_points';
import {
  getSpanLatencyAggregation,
  getLatencyValue,
  type AggregationLatency,
  getFailureRateAggregation,
  getSpanThroughputAggregation,
} from '../../utils/trace_metrics_aggregations';

const EXIT_SPAN_GROUP_BY = SPAN_DESTINATION_SERVICE_RESOURCE;
const EXIT_SPAN_LATENCY_TYPE = 'avg' as const;

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
  latency_type: typeof EXIT_SPAN_LATENCY_TYPE;
  time_series: Array<{
    group: string;
    latency: number | null;
    throughput: number | null;
    failure_rate: number | null;
  }>;
}

function getChangePointsAggs(bucketsPath: string) {
  return {
    change_point: {
      buckets_path: bucketsPath,
    },
  };
}

async function getServiceDestinationMetricSources({
  apmEventClient,
  start,
  end,
  kuery,
}: {
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  kuery: string;
}): Promise<TimeRangeMetadata['sources']> {
  const documentTypesToCheck = [ApmDocumentType.ServiceDestinationMetric as const];

  const documentTypesInfo = await getDocumentTypesInfo({
    apmEventClient,
    start,
    end,
    kuery,
    documentTypesToCheck,
  });

  return [
    ...documentTypesInfo,
    {
      documentType: ApmDocumentType.TransactionEvent,
      rollupInterval: RollupInterval.None,
      hasDocs: true,
      hasDurationSummaryField: false,
    },
  ];
}

export async function getExitSpanChangePoints({
  core,
  plugins,
  request,
  logger,
  start,
  end,
  kqlFilter,
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
}) {
  const { apmEventClient } = await buildApmResources({
    core,
    plugins,
    request,
    logger,
  });

  const startMs = parseDatemath(start);
  const endMs = parseDatemath(end);

  const kueryParts: string[] = [];
  if (kqlFilter) {
    kueryParts.push(kqlFilter);
  }
  kueryParts.push(`${EXIT_SPAN_GROUP_BY}: *`);
  const kuery = kueryParts.join(' AND ');

  const documentSources = await getServiceDestinationMetricSources({
    apmEventClient,
    start: startMs,
    end: endMs,
    kuery,
  });

  const { bucketSize } = getBucketSize({
    start: startMs,
    end: endMs,
    numBuckets: 100,
  });

  const { source } = getPreferredBucketSizeAndDataSource({
    sources: documentSources,
    bucketSizeInSeconds: bucketSize,
  });

  const { documentType, rollupInterval } = source;

  if (documentType !== ApmDocumentType.ServiceDestinationMetric) {
    return [];
  }

  const bucketSizeInSeconds = intervalToSeconds(rollupInterval);

  const response = await apmEventClient.search('get_exit_span_change_points', {
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
          field: EXIT_SPAN_GROUP_BY,
        },
        aggs: {
          time_series: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: `${bucketSizeInSeconds}s`,
            },
            aggs: {
              ...getSpanLatencyAggregation(),
              ...getFailureRateAggregation(documentType),
              ...getSpanThroughputAggregation(bucketSizeInSeconds / 60),
            },
          },
          changes_latency: getChangePointsAggs('time_series>latency'),
          changes_throughput: getChangePointsAggs('time_series>throughput'),
          changes_failure_rate: getChangePointsAggs('time_series>failure_rate'),
        },
      },
    },
  });
  return response.aggregations?.groups?.buckets ?? [];
}

export async function getToolHandler({
  core,
  plugins,
  request,
  logger,
  start,
  end,
  kqlFilter,
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
}): Promise<BucketChangePoints[]> {
  const buckets = await getExitSpanChangePoints({
    core,
    plugins,
    request,
    logger,
    start,
    end,
    kqlFilter,
  });

  const changePoints = buckets.map((bucket) => {
    const timeSeries = bucket.time_series.buckets.map((tsBucket) => {
      return {
        group: bucket.key as string,
        latency: getLatencyValue({
          latencyAggregationType: EXIT_SPAN_LATENCY_TYPE,
          aggregation: tsBucket.latency as AggregationLatency,
        }),
        throughput: tsBucket.throughput.value,
        failure_rate: tsBucket.failure_rate ? tsBucket.failure_rate.value : null,
      };
    });
    return {
      ...bucket,
      time_series: timeSeries,
      latency_type: EXIT_SPAN_LATENCY_TYPE,
    };
  });

  return changePoints as BucketChangePoints[];
}
