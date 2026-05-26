/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type {
  ObservabilityAgentBuilderPluginSetupDependencies,
  ObservabilityAgentBuilderPluginStart,
  ObservabilityAgentBuilderPluginStartDependencies,
} from '../../types';
import { parseDatemath } from '../../utils/time';
import { buildApmResources } from '../../utils/build_apm_resources';
import { timeRangeFilter, kqlFilter as buildKqlFilter } from '../../utils/dsl_filters';
import { getPreferredDocumentSource } from '../../utils/get_preferred_document_source';
import type { CoreSetup } from '@kbn/core/server';
import {
  type LatencyAggregationType,
  type DocumentType,
  getLatencyAggregation,
  getLatencyValue,
  getFailureRateAggregation,
  getThroughputAggregation,
} from '../../utils/trace_metrics_aggregations';

export type ApmTimeseriesMetric = 'latency' | 'failedTransactionRate' | 'throughput';

export interface ApmTimeseriesDataPoint {
  timestamp: number;
  value: number | null;
}

function autoInterval(durationMs: number): string {
  if (durationMs <= 2 * 60 * 60 * 1000) return '1m';
  if (durationMs <= 12 * 60 * 60 * 1000) return '5m';
  if (durationMs <= 48 * 60 * 60 * 1000) return '15m';
  return '1h';
}

export async function getToolHandler({
  core,
  plugins,
  request,
  logger,
  start,
  end,
  kqlFilter,
  metric,
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
  metric: ApmTimeseriesMetric;
  latencyType: LatencyAggregationType | undefined;
}): Promise<{
  dataPoints: ApmTimeseriesDataPoint[];
  metric: ApmTimeseriesMetric;
  unit: 'ms' | '%' | 'rpm';
}> {
  const { apmEventClient, apmDataAccessServices } = await buildApmResources({
    core,
    plugins,
    request,
    logger,
  });

  const startMs = parseDatemath(start);
  const endMs = parseDatemath(end);
  const durationMs = endMs - startMs;
  const intervalMs = durationMs / 60; // target ~60 buckets
  const interval = autoInterval(durationMs);

  const source = await getPreferredDocumentSource({
    apmDataAccessServices,
    start: startMs,
    end: endMs,
    kqlFilter,
  });

  const { rollupInterval, hasDurationSummaryField } = source;
  const documentType = source.documentType as DocumentType;

  const response = await apmEventClient.search('get_apm_timeseries', {
    apm: {
      sources: [{ documentType, rollupInterval }],
    },
    size: 0,
    track_total_hits: false,
    query: {
      bool: {
        filter: [
          ...timeRangeFilter('@timestamp', { start: startMs, end: endMs }),
          ...buildKqlFilter(kqlFilter),
        ],
      },
    },
    aggs: {
      timeseries: {
        date_histogram: {
          field: '@timestamp',
          fixed_interval: interval,
          min_doc_count: 0,
          extended_bounds: { min: startMs, max: endMs },
        },
        aggs: {
          ...getLatencyAggregation({
            latencyAggregationType: latencyType,
            hasDurationSummaryField,
            documentType,
          }),
          ...getFailureRateAggregation(documentType),
          ...getThroughputAggregation(intervalMs / 1000 / 60),
        },
      },
    },
  });

  const buckets = response.aggregations?.timeseries?.buckets ?? [];

  const dataPoints: ApmTimeseriesDataPoint[] = buckets.map((bucket) => {
    let value: number | null = null;

    if (metric === 'latency') {
      const raw = getLatencyValue({ latencyAggregationType: latencyType, aggregation: bucket.latency });
      value = raw != null ? raw / 1000 : null; // µs → ms
    } else if (metric === 'failedTransactionRate') {
      value = (bucket.failure_rate?.value as number | null) ?? null;
      if (value != null) value = value * 100; // fraction → percent
    } else if (metric === 'throughput') {
      value = (bucket.throughput?.value as number | null) ?? null;
    }

    return { timestamp: bucket.key as number, value };
  });

  const unit: 'ms' | '%' | 'rpm' =
    metric === 'latency' ? 'ms' : metric === 'failedTransactionRate' ? '%' : 'rpm';

  return { dataPoints, metric, unit };
}
