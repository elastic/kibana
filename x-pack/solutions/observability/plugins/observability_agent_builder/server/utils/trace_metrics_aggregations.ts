/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ApmDocumentType } from '@kbn/apm-data-access-plugin/common';
import {
  SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT,
  SPAN_DESTINATION_SERVICE_RESPONSE_TIME_SUM,
} from '@kbn/apm-types/es_fields';
import { getDurationFieldForTransactions } from '@kbn/apm-data-access-plugin/server/utils';
import { getOutcomeAggregation } from '@kbn/apm-data-access-plugin/server/utils';

export type DocumentType =
  | ApmDocumentType.ServiceTransactionMetric
  | ApmDocumentType.TransactionMetric
  | ApmDocumentType.TransactionEvent;

export type LatencyAggregationType = 'avg' | 'p99' | 'p95';

export function getLatencyAggregation({
  latencyAggregationType,
  hasDurationSummaryField,
  documentType,
}: {
  latencyAggregationType: LatencyAggregationType;
  hasDurationSummaryField: boolean;
  documentType: DocumentType;
}) {
  // cant calculate percentile aggregation on transaction.duration.summary field
  const useDurationSummaryField =
    hasDurationSummaryField && latencyAggregationType !== 'p95' && latencyAggregationType !== 'p99';
  const durationField = getDurationFieldForTransactions(documentType, useDurationSummaryField);
  return {
    latency: {
      ...(latencyAggregationType === 'avg'
        ? { avg: { field: durationField } }
        : {
            percentiles: {
              field: durationField,
              percents: [latencyAggregationType === 'p95' ? 95 : 99],
            },
          }),
    },
  };
}

export function getSpanLatencyAggregation() {
  // Destination metrics store response time as sum/count; percentiles are not supported.
  return {
    latency_sum: {
      sum: {
        field: SPAN_DESTINATION_SERVICE_RESPONSE_TIME_SUM,
      },
    },
    latency_count: {
      sum: {
        field: SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT,
      },
    },
    latency: {
      bucket_script: {
        buckets_path: {
          sum: 'latency_sum',
          count: 'latency_count',
        },
        script: {
          source: 'params.count != null && params.count > 0 ? params.sum / params.count : null',
        },
      },
    },
  };
}

export type AggregationLatency =
  | { value: number | null }
  | { values: Record<string, number | null> };

export function getLatencyValue({
  latencyAggregationType,
  aggregation,
}: {
  latencyAggregationType: LatencyAggregationType;
  aggregation: AggregationLatency;
}) {
  if ('value' in aggregation) {
    return aggregation.value;
  }
  if ('values' in aggregation) {
    return aggregation.values[latencyAggregationType === 'p95' ? '95.0' : '99.0'];
  }

  return null;
}

export function getFailureRateAggregation(documentType: ApmDocumentType) {
  const calculateFailedTransactionRate =
    'params.successful_or_failed != null && params.successful_or_failed > 0 ? (params.successful_or_failed - params.success) / params.successful_or_failed : 0';
  return {
    ...getOutcomeAggregation(documentType),
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
  };
}

export function getThroughputAggregation(durationAsMinutes: number) {
  return {
    throughput: {
      bucket_script: {
        buckets_path: {
          count: '_count',
        },
        script: {
          source: 'params.count != null ? params.count / params.durationAsMinutes : 0',
          params: {
            durationAsMinutes,
          },
        },
      },
    },
  };
}

export function getSpanThroughputAggregation(durationAsMinutes: number) {
  return {
    throughput_count: {
      sum: {
        field: SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT,
      },
    },
    throughput: {
      bucket_script: {
        buckets_path: {
          count: 'throughput_count',
        },
        script: {
          source: 'params.count != null ? params.count / params.durationAsMinutes : 0',
          params: {
            durationAsMinutes,
          },
        },
      },
    },
  };
}
