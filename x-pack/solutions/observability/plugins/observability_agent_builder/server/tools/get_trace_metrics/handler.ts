/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, KibanaRequest, Logger } from '@kbn/core/server';
import type { ApmDocumentType } from '@kbn/apm-data-access-plugin/common';
import {
  getPreferredBucketSizeAndDataSource,
  getBucketSize,
} from '@kbn/apm-data-access-plugin/common';
import {
  calculateFailedTransactionRate,
  getOutcomeAggregation,
  calculateThroughputWithRange,
  getDurationFieldForTransactions,
} from '@kbn/apm-data-access-plugin/server/utils';
import type {
  ObservabilityAgentBuilderPluginSetupDependencies,
  ObservabilityAgentBuilderPluginStart,
  ObservabilityAgentBuilderPluginStartDependencies,
} from '../../types';
import type { TraceMetricsItem } from '../../data_registry/data_registry_types';
import { parseDatemath } from '../../utils/time';
import { buildApmResources } from '../../utils/build_apm_resources';
import { timeRangeFilter, kqlFilter as buildKqlFilter } from '../../utils/dsl_filters';

const MAX_NUMBER_OF_GROUPS = 100;

export async function getToolHandler({
  core,
  plugins,
  request,
  logger,
  start,
  end,
  kqlFilter,
  groupBy,
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
  groupBy: string;
  kqlFilter?: string;
}): Promise<{
  items: TraceMetricsItem[];
}> {
  const { apmEventClient, apmDataAccessServices } = await buildApmResources({
    core,
    plugins,
    request,
    logger,
  });

  const startMs = parseDatemath(start);
  const endMs = parseDatemath(end);

  // Get preferred document source based on groupBy, filter, and data availability
  const kueryParts: string[] = [];
  if (kqlFilter) {
    kueryParts.push(kqlFilter);
  }
  kueryParts.push(`${groupBy}: *`);
  const kuery = kueryParts.join(' AND ');

  const documentSources = await apmDataAccessServices.getDocumentSources({
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

  const { rollupInterval, hasDurationSummaryField } = source;
  const documentType = source.documentType as
    | ApmDocumentType.ServiceTransactionMetric
    | ApmDocumentType.TransactionMetric
    | ApmDocumentType.TransactionEvent;

  const durationField = getDurationFieldForTransactions(documentType, hasDurationSummaryField);
  const outcomeAggs = getOutcomeAggregation(documentType);

  const response = await apmEventClient.search('get_trace_metrics', {
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
      groups: {
        terms: {
          field: groupBy,
          size: MAX_NUMBER_OF_GROUPS,
        },
        aggs: {
          avg_latency: {
            avg: {
              field: durationField,
            },
          },
          ...outcomeAggs,
        },
      },
    },
  });

  const buckets = response.aggregations?.groups?.buckets ?? [];

  const items: TraceMetricsItem[] = buckets.map((bucket) => {
    const docCount = bucket.doc_count;
    const latencyValue = bucket.avg_latency?.value;

    const latencyMs =
      latencyValue !== null && latencyValue !== undefined ? latencyValue / 1000 : null;

    const failureRate = calculateFailedTransactionRate(bucket);

    const throughput = calculateThroughputWithRange({
      start: startMs,
      end: endMs,
      value: docCount,
    });

    return {
      group: bucket.key as string,
      latency: latencyMs,
      throughput,
      failureRate,
    };
  });

  return {
    items,
  };
}
