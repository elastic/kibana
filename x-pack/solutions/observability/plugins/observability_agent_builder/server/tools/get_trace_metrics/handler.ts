/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { orderBy } from 'lodash';
import type { CoreSetup, KibanaRequest, Logger } from '@kbn/core/server';
import {
  calculateFailedTransactionRate,
  getOutcomeAggregation,
  calculateThroughputWithRange,
} from '@kbn/apm-data-access-plugin/server/utils';
import type {
  ObservabilityAgentBuilderPluginSetupDependencies,
  ObservabilityAgentBuilderPluginStart,
  ObservabilityAgentBuilderPluginStartDependencies,
} from '../../types';
import { parseDatemath } from '../../utils/time';
import { buildApmResources } from '../../utils/build_apm_resources';
import { timeRangeFilter, kqlFilter as buildKqlFilter } from '../../utils/dsl_filters';
import { getPreferredDocumentSource } from '../../utils/get_preferred_document_source';
import {
  type LatencyAggregationType,
  type DocumentType,
  getLatencyAggregation,
  getLatencyValue,
} from '../../utils/get_latency_aggregation';

export interface TraceMetricsItem {
  group: string;
  latency: number;
  throughput: number;
  failureRate: number;
}

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
  latencyType = 'avg',
  sortBy = 'latency',
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
  latencyType: LatencyAggregationType | undefined;
  sortBy: 'latency' | 'throughput' | 'failureRate';
}): Promise<{
  items: TraceMetricsItem[];
  latencyType: LatencyAggregationType;
}> {
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
          ...getOutcomeAggregation(documentType),
          ...getLatencyAggregation({
            latencyAggregationType: latencyType,
            hasDurationSummaryField,
            documentType,
          }),
        },
      },
    },
  });

  const buckets = response.aggregations?.groups?.buckets ?? [];

  const items: TraceMetricsItem[] = buckets.map((bucket) => {
    const docCount = bucket.doc_count;
    const latencyValue = getLatencyValue({
      latencyAggregationType: latencyType,
      aggregation: bucket.latency,
    });

    const latencyMs =
      latencyValue !== null && latencyValue !== undefined ? latencyValue / 1000 : -1;

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
    items: orderBy(items, [sortBy], ['desc']),
    latencyType,
  };
}
