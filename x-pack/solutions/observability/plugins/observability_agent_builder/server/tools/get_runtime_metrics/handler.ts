/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { kqlQuery } from '@kbn/observability-utils-server/es/queries/kql_query';
import { rangeQuery } from '@kbn/observability-utils-server/es/queries/range_query';
import { ProcessorEvent } from '@kbn/apm-types-shared';
import {
  SERVICE_NAME,
  SERVICE_NODE_NAME,
  HOST_NAME,
  METRIC_PROCESS_CPU_PERCENT,
  METRIC_JAVA_HEAP_MEMORY_USED,
  METRIC_JAVA_HEAP_MEMORY_MAX,
  METRIC_JAVA_NON_HEAP_MEMORY_USED,
  METRIC_JAVA_NON_HEAP_MEMORY_MAX,
  METRIC_JAVA_THREAD_COUNT,
  METRIC_JAVA_GC_TIME,
  METRIC_OTEL_JVM_CPU_PERCENT,
  METRIC_OTEL_JVM_MEMORY_USED,
  METRIC_OTEL_JVM_MEMORY_LIMIT,
  METRIC_OTEL_JVM_THREAD_COUNT,
  METRIC_OTEL_JVM_GC_DURATION_SECONDS,
  ATTRIBUTE_OTEL_JVM_MEMORY_TYPE,
  LABEL_OTEL_JVM_MEMORY_TYPE,
  VALUE_OTEL_JVM_MEMORY_TYPE_HEAP,
  VALUE_OTEL_JVM_MEMORY_TYPE_NON_HEAP,
} from '@kbn/apm-types';
import type {
  ObservabilityAgentBuilderCoreSetup,
  ObservabilityAgentBuilderPluginSetupDependencies,
} from '../../types';
import { buildApmResources } from '../../utils/build_apm_resources';
import { parseDatemath } from '../../utils/time';
import { environmentQuery } from './environment_query';

// Simple helper to convert readonly arrays to mutable for ES query building
function asMutableArray<T extends readonly unknown[]>(arr: T): [...T] {
  return arr as [...T];
}

export interface RuntimeMetricsNode {
  serviceName: string;
  serviceNodeName: string;
  hostName: string | null | undefined;
  runtime: 'jvm';
  cpuUtilization: number | null;
  heapMemoryBytes: number | null;
  heapMemoryMaxBytes: number | null;
  heapMemoryUtilization: number | null;
  nonHeapMemoryBytes: number | null;
  nonHeapMemoryMaxBytes: number | null;
  nonHeapMemoryUtilization: number | null;
  threadCount: number | null;
  gcDurationMs: number | null;
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
  limit = 20,
  kqlFilter,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  request: KibanaRequest;
  logger: Logger;
  serviceName?: string;
  serviceEnvironment?: string;
  start: string;
  end: string;
  limit?: number;
  kqlFilter?: string;
}): Promise<{ nodes: RuntimeMetricsNode[] }> {
  const startMs = parseDatemath(start);
  const endMs = parseDatemath(end, { roundUp: true });

  if (!startMs || !endMs) {
    throw new Error('Invalid date range provided.');
  }

  const { apmEventClient } = await buildApmResources({ core, plugins, request, logger });

  // Check if service has OTel JVM metrics
  const hasOtelJvmMetrics = await checkHasOtelJvmMetrics({
    apmEventClient,
    serviceName,
    serviceEnvironment,
    startMs,
    endMs,
    kqlFilter,
  });

  if (hasOtelJvmMetrics) {
    return getOtelJvmMetrics({
      apmEventClient,
      serviceName,
      serviceEnvironment,
      startMs,
      endMs,
      limit,
      kqlFilter,
    });
  }

  // Fall back to Elastic APM JVM metrics
  return getElasticApmJvmMetrics({
    apmEventClient,
    serviceName,
    serviceEnvironment,
    startMs,
    endMs,
    limit,
    kqlFilter,
  });
}

function serviceNameQuery(serviceName?: string) {
  return serviceName ? [{ term: { [SERVICE_NAME]: serviceName } }] : [];
}

async function checkHasOtelJvmMetrics({
  apmEventClient,
  serviceName,
  serviceEnvironment,
  startMs,
  endMs,
  kqlFilter,
}: {
  apmEventClient: Awaited<ReturnType<typeof buildApmResources>>['apmEventClient'];
  serviceName?: string;
  serviceEnvironment?: string;
  startMs: number;
  endMs: number;
  kqlFilter?: string;
}): Promise<boolean> {
  const params = {
    apm: {
      events: [ProcessorEvent.metric],
    },
    track_total_hits: false,
    size: 1,
    query: {
      bool: {
        filter: [
          ...serviceNameQuery(serviceName),
          ...rangeQuery(startMs, endMs),
          ...environmentQuery(serviceEnvironment),
          ...kqlQuery(kqlFilter),
          {
            bool: {
              should: [
                { exists: { field: METRIC_OTEL_JVM_CPU_PERCENT } },
                { exists: { field: METRIC_OTEL_JVM_MEMORY_USED } },
                { exists: { field: METRIC_OTEL_JVM_THREAD_COUNT } },
              ],
              minimum_should_match: 1,
            },
          },
        ],
      },
    },
    _source: false,
  };

  const response = await apmEventClient.search('check_has_otel_jvm_metrics', params, {
    skipProcessorEventFilter: true,
  });

  return response.hits.hits.length > 0;
}

async function getOtelJvmMetrics({
  apmEventClient,
  serviceName,
  serviceEnvironment,
  startMs,
  endMs,
  limit,
  kqlFilter,
}: {
  apmEventClient: Awaited<ReturnType<typeof buildApmResources>>['apmEventClient'];
  serviceName?: string;
  serviceEnvironment?: string;
  startMs: number;
  endMs: number;
  limit: number;
  kqlFilter?: string;
}): Promise<{ nodes: RuntimeMetricsNode[] }> {
  const params = {
    apm: {
      events: [ProcessorEvent.metric],
    },
    track_total_hits: false,
    size: 0,
    query: {
      bool: {
        filter: [
          ...serviceNameQuery(serviceName),
          ...rangeQuery(startMs, endMs),
          ...environmentQuery(serviceEnvironment),
          ...kqlQuery(kqlFilter),
        ],
      },
    },
    aggs: {
      nodes: {
        terms: {
          field: SERVICE_NODE_NAME,
          size: limit,
        },
        aggs: {
          latest: {
            top_metrics: {
              metrics: asMutableArray([{ field: SERVICE_NAME }, { field: HOST_NAME }] as const),
              sort: {
                '@timestamp': 'desc' as const,
              },
            },
          },
          cpu: {
            avg: {
              field: METRIC_OTEL_JVM_CPU_PERCENT,
            },
          },
          heapMemory: {
            filter: {
              bool: {
                should: [
                  // OTel native ingest (EDOT Collector → ES)
                  { term: { [ATTRIBUTE_OTEL_JVM_MEMORY_TYPE]: VALUE_OTEL_JVM_MEMORY_TYPE_HEAP } },
                  // APM Server ingest (OTel SDK → APM Server → ES)
                  { term: { [LABEL_OTEL_JVM_MEMORY_TYPE]: VALUE_OTEL_JVM_MEMORY_TYPE_HEAP } },
                ],
                minimum_should_match: 1,
              },
            },
            aggs: {
              usage: {
                avg: {
                  field: METRIC_OTEL_JVM_MEMORY_USED,
                },
              },
              limit: {
                max: {
                  field: METRIC_OTEL_JVM_MEMORY_LIMIT,
                },
              },
            },
          },
          nonHeapMemory: {
            filter: {
              bool: {
                should: [
                  // OTel native ingest (EDOT Collector → ES)
                  {
                    term: { [ATTRIBUTE_OTEL_JVM_MEMORY_TYPE]: VALUE_OTEL_JVM_MEMORY_TYPE_NON_HEAP },
                  },
                  // APM Server ingest (OTel SDK → APM Server → ES)
                  { term: { [LABEL_OTEL_JVM_MEMORY_TYPE]: VALUE_OTEL_JVM_MEMORY_TYPE_NON_HEAP } },
                ],
                minimum_should_match: 1,
              },
            },
            aggs: {
              usage: {
                avg: {
                  field: METRIC_OTEL_JVM_MEMORY_USED,
                },
              },
              limit: {
                max: {
                  field: METRIC_OTEL_JVM_MEMORY_LIMIT,
                },
              },
            },
          },
          threadCount: {
            max: {
              field: METRIC_OTEL_JVM_THREAD_COUNT,
            },
          },
          gcDuration: {
            sum: {
              field: METRIC_OTEL_JVM_GC_DURATION_SECONDS,
            },
          },
        },
      },
    },
  };

  const response = await apmEventClient.search('get_otel_jvm_metrics', params, {
    skipProcessorEventFilter: true,
  });

  if (!response.aggregations) {
    return { nodes: [] };
  }

  const nodes = response.aggregations.nodes.buckets
    .map((bucket) => ({
      serviceName: bucket.latest.top?.[0]?.metrics?.[SERVICE_NAME] as string,
      serviceNodeName: bucket.key as string,
      hostName: bucket.latest.top?.[0]?.metrics?.[HOST_NAME] as string | null | undefined,
      runtime: 'jvm' as const,
      cpuUtilization: bucket.cpu.value,
      heapMemoryBytes: bucket.heapMemory.usage.value,
      heapMemoryMaxBytes: bucket.heapMemory.limit.value,
      heapMemoryUtilization:
        bucket.heapMemory.usage.value && bucket.heapMemory.limit.value
          ? bucket.heapMemory.usage.value / bucket.heapMemory.limit.value
          : null,
      nonHeapMemoryBytes: bucket.nonHeapMemory.usage.value,
      nonHeapMemoryMaxBytes: bucket.nonHeapMemory.limit.value,
      nonHeapMemoryUtilization:
        bucket.nonHeapMemory.usage.value && bucket.nonHeapMemory.limit.value
          ? bucket.nonHeapMemory.usage.value / bucket.nonHeapMemory.limit.value
          : null,
      threadCount: bucket.threadCount.value,
      // OTel GC duration is in seconds, convert to ms
      gcDurationMs: bucket.gcDuration.value !== null ? bucket.gcDuration.value * 1000 : null,
    }))
    .filter(
      (item) =>
        // Require at least one primary metric (not just GC which can be 0 from sum agg)
        item.cpuUtilization !== null ||
        item.heapMemoryBytes !== null ||
        item.nonHeapMemoryBytes !== null ||
        item.threadCount !== null
    );

  return { nodes };
}

async function getElasticApmJvmMetrics({
  apmEventClient,
  serviceName,
  serviceEnvironment,
  startMs,
  endMs,
  limit,
  kqlFilter,
}: {
  apmEventClient: Awaited<ReturnType<typeof buildApmResources>>['apmEventClient'];
  serviceName?: string;
  serviceEnvironment?: string;
  startMs: number;
  endMs: number;
  limit: number;
  kqlFilter?: string;
}): Promise<{ nodes: RuntimeMetricsNode[] }> {
  const params = {
    apm: {
      events: [ProcessorEvent.metric],
    },
    track_total_hits: false,
    size: 0,
    query: {
      bool: {
        filter: [
          ...serviceNameQuery(serviceName),
          ...rangeQuery(startMs, endMs),
          ...environmentQuery(serviceEnvironment),
          ...kqlQuery(kqlFilter),
        ],
      },
    },
    aggs: {
      nodes: {
        terms: {
          field: SERVICE_NODE_NAME,
          size: limit,
        },
        aggs: {
          latest: {
            top_metrics: {
              metrics: asMutableArray([{ field: SERVICE_NAME }, { field: HOST_NAME }] as const),
              sort: {
                '@timestamp': 'desc' as const,
              },
            },
          },
          cpu: {
            avg: {
              field: METRIC_PROCESS_CPU_PERCENT,
            },
          },
          heapMemory: {
            avg: {
              field: METRIC_JAVA_HEAP_MEMORY_USED,
            },
          },
          heapMemoryMax: {
            max: {
              field: METRIC_JAVA_HEAP_MEMORY_MAX,
            },
          },
          nonHeapMemory: {
            avg: {
              field: METRIC_JAVA_NON_HEAP_MEMORY_USED,
            },
          },
          nonHeapMemoryMax: {
            max: {
              field: METRIC_JAVA_NON_HEAP_MEMORY_MAX,
            },
          },
          threadCount: {
            max: {
              field: METRIC_JAVA_THREAD_COUNT,
            },
          },
          gcTime: {
            sum: {
              field: METRIC_JAVA_GC_TIME,
            },
          },
        },
      },
    },
  };

  const response = await apmEventClient.search('get_elastic_apm_jvm_metrics', params);

  if (!response.aggregations) {
    return { nodes: [] };
  }

  const nodes = response.aggregations.nodes.buckets
    .map((bucket) => ({
      serviceName: bucket.latest.top?.[0]?.metrics?.[SERVICE_NAME] as string,
      serviceNodeName: bucket.key as string,
      hostName: bucket.latest.top?.[0]?.metrics?.[HOST_NAME] as string | null | undefined,
      runtime: 'jvm' as const,
      cpuUtilization: bucket.cpu.value,
      heapMemoryBytes: bucket.heapMemory.value,
      heapMemoryMaxBytes: bucket.heapMemoryMax.value,
      heapMemoryUtilization:
        bucket.heapMemory.value && bucket.heapMemoryMax.value
          ? bucket.heapMemory.value / bucket.heapMemoryMax.value
          : null,
      nonHeapMemoryBytes: bucket.nonHeapMemory.value,
      nonHeapMemoryMaxBytes: bucket.nonHeapMemoryMax.value,
      nonHeapMemoryUtilization:
        bucket.nonHeapMemory.value && bucket.nonHeapMemoryMax.value
          ? bucket.nonHeapMemory.value / bucket.nonHeapMemoryMax.value
          : null,
      threadCount: bucket.threadCount.value,
      // Elastic APM GC time is already in ms
      gcDurationMs: bucket.gcTime.value,
    }))
    .filter(
      (item) =>
        // Require at least one primary metric (not just GC which can be 0 from sum agg)
        item.cpuUtilization !== null ||
        item.heapMemoryBytes !== null ||
        item.nonHeapMemoryBytes !== null ||
        item.threadCount !== null
    );

  return { nodes };
}
