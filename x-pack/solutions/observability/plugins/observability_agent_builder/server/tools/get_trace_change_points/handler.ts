/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreSetup, KibanaRequest, Logger } from '@kbn/core/server';
import { ApmDocumentType } from '@kbn/apm-data-access-plugin/common';
import type { ChangePointType } from '@kbn/es-types/src';
import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/types';
import { intervalToSeconds } from '@kbn/apm-data-access-plugin/common/utils/get_preferred_bucket_size_and_data_source';
import {
  getOutcomeAggregation,
  getDurationFieldForTransactions,
} from '@kbn/apm-data-access-plugin/server/utils';
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
  time_series: {
    buckets: Array<
      Bucket & {
        latency: {
          value: number | null;
        };
        throughput: {
          value: number | null;
        };
        failure_rate: {
          value: number | null;
        };
      }
    >;
  };
}

type LatencyAggregationType = 'avg' | 'p99' | 'p95';

type DocumentType =
  | ApmDocumentType.ServiceTransactionMetric
  | ApmDocumentType.TransactionMetric
  | ApmDocumentType.TransactionEvent;

function getChangePointsAggs(bucketsPath: string) {
  const changePointAggs = {
    change_point: {
      buckets_path: bucketsPath,
    },
    // elasticsearch@9.0.0 change_point aggregation is missing in the types: https://github.com/elastic/elasticsearch-specification/issues/3671
  } as AggregationsAggregationContainer;
  return changePointAggs;
}

function getLatencyAggregation(latencyAggregationType: LatencyAggregationType, field: string) {
  return {
    latency: {
      ...(latencyAggregationType === 'avg'
        ? { avg: { field } }
        : {
            percentiles: {
              field,
              percents: [latencyAggregationType === 'p95' ? 95 : 99],
            },
          }),
    },
  };
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
  // cant calculate percentile aggregation on transaction.duration.summary field
  const useDurationSummaryField =
    hasDurationSummaryField && latencyType !== 'p95' && latencyType !== 'p99';
  const durationField = getDurationFieldForTransactions(documentType, useDurationSummaryField);
  const bucketSizeInSeconds = intervalToSeconds(rollupInterval);

  const calculateFailedTransactionRate =
    'params.successful_or_failed != null && params.successful_or_failed > 0 ? (params.successful_or_failed - params.success) / params.successful_or_failed : 0';

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
              ...getOutcomeAggregation(documentType),
              ...getLatencyAggregation(latencyType, durationField),
              failure_rate:
                documentType === ApmDocumentType.ServiceTransactionMetric
                  ? {
                      bucket_script: {
                        buckets_path: {
                          successful_or_failed: 'successful_or_failed',
                          success: 'successful',
                        },
                        script: {
                          source: calculateFailedTransactionRate,
                        },
                      },
                    }
                  : {
                      bucket_script: {
                        buckets_path: {
                          successful_or_failed: 'successful_or_failed>_count',
                          success: 'successful>_count',
                        },
                        script: {
                          source: calculateFailedTransactionRate,
                        },
                      },
                    },
              throughput: {
                bucket_script: {
                  buckets_path: {
                    count: '_count',
                  },
                  script: {
                    source: 'params.count != null ? params.count / (params.bucketSize / 60.0) : 0',
                    params: {
                      bucketSize: bucketSizeInSeconds,
                    },
                  },
                },
              },
            },
          },
          changes_latency: getChangePointsAggs('time_series>latency'),
          changes_throughput: getChangePointsAggs('time_series>throughput'),
          changes_failure_rate: getChangePointsAggs('time_series>failure_rate'),
        },
      },
    },
  });

  return (response.aggregations?.groups?.buckets as BucketChangePoints[]) ?? [];
}
