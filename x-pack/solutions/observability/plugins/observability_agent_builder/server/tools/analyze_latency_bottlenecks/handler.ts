/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, KibanaRequest, Logger } from '@kbn/core/server';
import type { ApmDocumentType } from '@kbn/apm-data-access-plugin/common';
import {
  calculateFailedTransactionRate,
  getOutcomeAggregation,
  calculateThroughputWithRange,
  getDurationFieldForTransactions,
} from '@kbn/apm-data-access-plugin/server/utils';
import {
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_TYPE,
  SPAN_SUBTYPE,
} from '@kbn/apm-types';
import type {
  ObservabilityAgentBuilderPluginSetupDependencies,
  ObservabilityAgentBuilderPluginStart,
  ObservabilityAgentBuilderPluginStartDependencies,
} from '../../types';
import { parseDatemath } from '../../utils/time';
import { buildApmResources } from '../../utils/build_apm_resources';
import { timeRangeFilter, environmentFilter } from '../../utils/dsl_filters';
import { getPreferredDocumentSource } from '../../utils/get_preferred_document_source';

const MAX_TRANSACTION_GROUPS = 50;
const MAX_DEPENDENCIES = 25;

export interface TransactionBottleneck {
  name: string;
  transactionType: string;
  latencyMs: number | null;
  throughputPerMin: number;
  failureRate: number;
  /** Percentage of total service duration consumed by this transaction */
  impactPercent: number;
}

export interface DependencyBottleneck {
  resource: string;
  spanType?: string;
  spanSubtype?: string;
  latencyMs: number | null;
  throughputPerMin: number;
  failureRate: number;
  /** Percentage of total dependency call duration */
  impactPercent: number;
}

export interface LatencyBottleneckInsight {
  type:
    | 'slowest_transaction'
    | 'highest_impact_transaction'
    | 'slow_dependency'
    | 'high_error_rate';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  metric: {
    name: string;
    value: number;
    unit: string;
  };
  recommendation: string;
}

export interface LatencyBottleneckAnalysis {
  serviceName: string;
  timeRange: {
    start: string;
    end: string;
  };
  summary: {
    totalTransactions: number;
    avgLatencyMs: number | null;
    p95LatencyMs: number | null;
    totalThroughputPerMin: number;
    overallFailureRate: number;
  };
  transactionBottlenecks: TransactionBottleneck[];
  dependencyBottlenecks: DependencyBottleneck[];
  insights: LatencyBottleneckInsight[];
}

export async function getToolHandler({
  core,
  plugins,
  request,
  logger,
  serviceName,
  serviceEnvironment,
  start,
  end,
  transactionType,
}: {
  core: CoreSetup<
    ObservabilityAgentBuilderPluginStartDependencies,
    ObservabilityAgentBuilderPluginStart
  >;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  request: KibanaRequest;
  logger: Logger;
  serviceName: string;
  serviceEnvironment?: string;
  start: string;
  end: string;
  transactionType?: string;
}): Promise<LatencyBottleneckAnalysis> {
  const { apmEventClient, apmDataAccessServices } = await buildApmResources({
    core,
    plugins,
    request,
    logger,
  });

  const startMs = parseDatemath(start);
  const endMs = parseDatemath(end);

  // Get preferred document source for transactions
  const source = await getPreferredDocumentSource({
    apmDataAccessServices,
    start: startMs,
    end: endMs,
    groupBy: TRANSACTION_NAME,
    kqlFilter: `${SERVICE_NAME}: "${serviceName}"`,
  });

  const { rollupInterval, hasDurationSummaryField } = source;
  const documentType = source.documentType as
    | ApmDocumentType.ServiceTransactionMetric
    | ApmDocumentType.TransactionMetric
    | ApmDocumentType.TransactionEvent;

  const durationField = getDurationFieldForTransactions(documentType, hasDurationSummaryField);
  const outcomeAggs = getOutcomeAggregation(documentType);

  // Build common filters
  const baseFilters = [
    ...timeRangeFilter('@timestamp', { start: startMs, end: endMs }),
    { term: { [SERVICE_NAME]: serviceName } },
    ...environmentFilter(serviceEnvironment),
    ...(transactionType ? [{ term: { [TRANSACTION_TYPE]: transactionType } }] : []),
  ];

  // Fetch transaction groups with latency metrics
  const transactionResponse = await apmEventClient.search(
    'analyze_latency_bottlenecks_transactions',
    {
      apm: {
        sources: [{ documentType, rollupInterval }],
      },
      size: 0,
      track_total_hits: true,
      query: {
        bool: {
          filter: baseFilters,
        },
      },
      aggs: {
        total_duration: {
          sum: { field: durationField },
        },
        avg_latency: {
          avg: { field: durationField },
        },
        p95_latency: {
          percentiles: {
            field: durationField,
            percents: [95],
          },
        },
        ...outcomeAggs,
        transaction_groups: {
          terms: {
            field: TRANSACTION_NAME,
            size: MAX_TRANSACTION_GROUPS,
            order: { total_group_duration: 'desc' },
          },
          aggs: {
            total_group_duration: {
              sum: { field: durationField },
            },
            avg_latency: {
              avg: { field: durationField },
            },
            transaction_type: {
              terms: {
                field: TRANSACTION_TYPE,
                size: 1,
              },
            },
            ...outcomeAggs,
          },
        },
      },
    }
  );

  const totalDuration = transactionResponse.aggregations?.total_duration?.value ?? 0;
  const totalHits =
    typeof transactionResponse.hits.total === 'number'
      ? transactionResponse.hits.total
      : transactionResponse.hits.total?.value ?? 0;

  const avgLatency = transactionResponse.aggregations?.avg_latency?.value ?? null;
  const p95Latency = transactionResponse.aggregations?.p95_latency?.values?.['95.0'] ?? null;
  const overallFailureRate = calculateFailedTransactionRate(transactionResponse.aggregations ?? {});

  const transactionBuckets = transactionResponse.aggregations?.transaction_groups?.buckets ?? [];

  const transactionBottlenecks: TransactionBottleneck[] = transactionBuckets.map((bucket: any) => {
    const latencyValue = bucket.avg_latency?.value;
    const latencyMs =
      latencyValue !== null && latencyValue !== undefined ? latencyValue / 1000 : null;
    const failureRate = calculateFailedTransactionRate(bucket);
    const throughput = calculateThroughputWithRange({
      start: startMs,
      end: endMs,
      value: bucket.doc_count,
    });
    const groupDuration = bucket.total_group_duration?.value ?? 0;
    const impactPercent = totalDuration > 0 ? (groupDuration / totalDuration) * 100 : 0;
    const txType = bucket.transaction_type?.buckets?.[0]?.key ?? 'request';

    return {
      name: bucket.key as string,
      transactionType: txType,
      latencyMs,
      throughputPerMin: throughput,
      failureRate,
      impactPercent,
    };
  });

  // Fetch exit span (dependency) metrics
  const dependencyResponse = await apmEventClient.search(
    'analyze_latency_bottlenecks_dependencies',
    {
      apm: {
        sources: [
          {
            documentType: 'span' as unknown as ApmDocumentType,
            rollupInterval,
          },
        ],
      },
      size: 0,
      track_total_hits: false,
      query: {
        bool: {
          filter: [
            ...timeRangeFilter('@timestamp', { start: startMs, end: endMs }),
            { term: { [SERVICE_NAME]: serviceName } },
            ...environmentFilter(serviceEnvironment),
            { exists: { field: SPAN_DESTINATION_SERVICE_RESOURCE } },
          ],
        },
      },
      aggs: {
        total_span_duration: {
          sum: { field: 'span.duration.us' },
        },
        dependencies: {
          terms: {
            field: SPAN_DESTINATION_SERVICE_RESOURCE,
            size: MAX_DEPENDENCIES,
            order: { total_dep_duration: 'desc' },
          },
          aggs: {
            total_dep_duration: {
              sum: { field: 'span.duration.us' },
            },
            avg_latency: {
              avg: { field: 'span.duration.us' },
            },
            span_type: {
              terms: { field: SPAN_TYPE, size: 1 },
            },
            span_subtype: {
              terms: { field: SPAN_SUBTYPE, size: 1 },
            },
            outcomes: {
              terms: { field: 'event.outcome', size: 3 },
            },
          },
        },
      },
    }
  );

  const totalSpanDuration = dependencyResponse.aggregations?.total_span_duration?.value ?? 0;
  const dependencyBuckets = dependencyResponse.aggregations?.dependencies?.buckets ?? [];

  const dependencyBottlenecks: DependencyBottleneck[] = dependencyBuckets.map((bucket: any) => {
    const latencyValue = bucket.avg_latency?.value;
    const latencyMs =
      latencyValue !== null && latencyValue !== undefined ? latencyValue / 1000 : null;

    const outcomes = bucket.outcomes?.buckets ?? [];
    const failureCount = outcomes.find((o: any) => o.key === 'failure')?.doc_count ?? 0;
    const successCount = outcomes.find((o: any) => o.key === 'success')?.doc_count ?? 0;
    const totalOutcomes = failureCount + successCount;
    const failureRate = totalOutcomes > 0 ? failureCount / totalOutcomes : 0;

    const throughput = calculateThroughputWithRange({
      start: startMs,
      end: endMs,
      value: bucket.doc_count,
    });
    const depDuration = bucket.total_dep_duration?.value ?? 0;
    const impactPercent = totalSpanDuration > 0 ? (depDuration / totalSpanDuration) * 100 : 0;

    return {
      resource: bucket.key as string,
      spanType: bucket.span_type?.buckets?.[0]?.key,
      spanSubtype: bucket.span_subtype?.buckets?.[0]?.key,
      latencyMs,
      throughputPerMin: throughput,
      failureRate,
      impactPercent,
    };
  });

  // Generate insights
  const insights: LatencyBottleneckInsight[] = [];

  // Find the slowest transaction
  const slowestTx = transactionBottlenecks.reduce<TransactionBottleneck | null>(
    (max, tx) => (!max || (tx.latencyMs ?? 0) > (max.latencyMs ?? 0) ? tx : max),
    null
  );

  if (slowestTx && slowestTx.latencyMs && slowestTx.latencyMs > 1000) {
    const severity =
      slowestTx.latencyMs > 5000 ? 'critical' : slowestTx.latencyMs > 2000 ? 'warning' : 'info';
    insights.push({
      type: 'slowest_transaction',
      severity,
      title: `Slowest transaction: ${slowestTx.name}`,
      description: `This transaction has an average latency of ${Math.round(
        slowestTx.latencyMs
      )}ms, which is significantly higher than others.`,
      metric: {
        name: 'Average Latency',
        value: Math.round(slowestTx.latencyMs),
        unit: 'ms',
      },
      recommendation: `Investigate the "${slowestTx.name}" transaction. Check for slow database queries, external API calls, or inefficient code paths. Consider adding tracing spans to identify specific bottlenecks.`,
    });
  }

  // Find highest impact transaction
  const highestImpactTx = transactionBottlenecks.reduce<TransactionBottleneck | null>(
    (max, tx) => (!max || tx.impactPercent > max.impactPercent ? tx : max),
    null
  );

  if (
    highestImpactTx &&
    highestImpactTx.impactPercent > 30 &&
    highestImpactTx.name !== slowestTx?.name
  ) {
    insights.push({
      type: 'highest_impact_transaction',
      severity: highestImpactTx.impactPercent > 50 ? 'warning' : 'info',
      title: `Highest impact transaction: ${highestImpactTx.name}`,
      description: `This transaction accounts for ${Math.round(
        highestImpactTx.impactPercent
      )}% of total service time. Optimizing it would have the greatest overall impact.`,
      metric: {
        name: 'Impact',
        value: Math.round(highestImpactTx.impactPercent),
        unit: '%',
      },
      recommendation: `Focus optimization efforts on "${highestImpactTx.name}" as it consumes the most resources. Even small improvements will significantly reduce overall service latency.`,
    });
  }

  // Find slow dependencies
  const slowDeps = dependencyBottlenecks.filter((dep) => dep.latencyMs && dep.latencyMs > 500);
  for (const dep of slowDeps.slice(0, 2)) {
    if (dep.latencyMs) {
      const severity =
        dep.latencyMs > 2000 ? 'critical' : dep.latencyMs > 1000 ? 'warning' : 'info';
      insights.push({
        type: 'slow_dependency',
        severity,
        title: `Slow dependency: ${dep.resource}`,
        description: `External calls to "${dep.resource}" average ${Math.round(
          dep.latencyMs
        )}ms. This dependency accounts for ${Math.round(
          dep.impactPercent
        )}% of external call time.`,
        metric: {
          name: 'Average Latency',
          value: Math.round(dep.latencyMs),
          unit: 'ms',
        },
        recommendation: `Investigate the "${dep.resource}" dependency. Consider adding caching, connection pooling, or optimizing queries. If this is a third-party service, evaluate SLA compliance.`,
      });
    }
  }

  // Find high error rate transactions
  const highErrorTxs = transactionBottlenecks.filter((tx) => tx.failureRate > 0.05);
  for (const tx of highErrorTxs.slice(0, 2)) {
    const severity = tx.failureRate > 0.2 ? 'critical' : tx.failureRate > 0.1 ? 'warning' : 'info';
    insights.push({
      type: 'high_error_rate',
      severity,
      title: `High error rate: ${tx.name}`,
      description: `The "${tx.name}" transaction has a ${Math.round(
        tx.failureRate * 100
      )}% failure rate, which may indicate reliability issues.`,
      metric: {
        name: 'Error Rate',
        value: Math.round(tx.failureRate * 100),
        unit: '%',
      },
      recommendation: `Investigate errors in "${tx.name}". Check application logs and error traces for root cause. High error rates often correlate with latency spikes due to retry logic.`,
    });
  }

  // Sort insights by severity
  const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
  insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return {
    serviceName,
    timeRange: {
      start,
      end,
    },
    summary: {
      totalTransactions: totalHits,
      avgLatencyMs: avgLatency ? avgLatency / 1000 : null,
      p95LatencyMs: p95Latency ? p95Latency / 1000 : null,
      totalThroughputPerMin: calculateThroughputWithRange({
        start: startMs,
        end: endMs,
        value: totalHits,
      }),
      overallFailureRate,
    },
    transactionBottlenecks: transactionBottlenecks.slice(0, 10), // Top 10 by impact
    dependencyBottlenecks: dependencyBottlenecks.slice(0, 10), // Top 10 by impact
    insights,
  };
}
