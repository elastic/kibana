/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, KibanaRequest, Logger } from '@kbn/core/server';
import datemath from '@elastic/datemath';
import { compact, isEmpty } from 'lodash';
import moment from 'moment';
import { SPAN_DESTINATION_SERVICE_RESOURCE, SPAN_DURATION } from '@kbn/apm-types';
import { ApmDocumentType, getBucketSize, RollupInterval } from '@kbn/apm-data-access-plugin/common';
import type { ObservabilityAgentBuilderDataRegistry } from '../../../data_registry/data_registry';
import type {
  ObservabilityAgentBuilderCoreSetup,
  ObservabilityAgentBuilderPluginSetupDependencies,
} from '../../../types';
import { getToolHandler as getLogGroups } from '../../../tools/get_log_groups/handler';
import { getToolHandler as getRuntimeMetrics } from '../../../tools/get_runtime_metrics/handler';
import { getToolHandler as getHosts } from '../../../tools/get_hosts/handler';
import { getToolHandler as getServices } from '../../../tools/get_services/handler';
import { getTraceChangePoints } from '../../../tools/get_trace_change_points/handler';
import { getServiceTopology } from '../../../tools/get_service_topology/get_service_topology';

export interface SignalFetcherDeps {
  core: ObservabilityAgentBuilderCoreSetup;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  dataRegistry: ObservabilityAgentBuilderDataRegistry;
  esClient: IScopedClusterClient;
  request: KibanaRequest;
  logger: Logger;
  serviceName: string;
  serviceEnvironment: string;
  transactionType?: string;
  transactionName?: string;
  hostName: string;
}

export interface SignalFetcher {
  key: string;
  description: string;
  startOffsetMinutes: number;
  fetch: (deps: SignalFetcherDeps, start: string, end: string) => Promise<unknown>;
}

export interface SignalResult {
  key: string;
  description: string;
  start: string;
  end: string;
  data: unknown;
}

export const SIGNAL_FETCHERS: SignalFetcher[] = [
  {
    key: 'apmServiceSummary',
    description: 'instance counts, versions, anomalies, and metadata',
    startOffsetMinutes: 5,
    async fetch(
      { dataRegistry, request, serviceName, serviceEnvironment, transactionType },
      start,
      end
    ) {
      if (!serviceName) return null;
      const data = await dataRegistry.getData('apmServiceSummary', {
        request,
        serviceName,
        serviceEnvironment,
        transactionType,
        start,
        end,
      });
      return isEmpty(data) ? null : data;
    },
  },
  {
    key: 'apmServiceChangePoints',
    description: 'sudden shifts in throughput/latency/failure rate — shows when problems started',
    startOffsetMinutes: 6 * 60,
    async fetch(
      {
        core,
        plugins,
        request,
        logger,
        serviceName,
        serviceEnvironment,
        transactionType,
        transactionName,
      },
      start,
      end
    ) {
      if (!serviceName) return null;
      let kqlFilter = `service.name: "${serviceName}" AND service.environment: "${serviceEnvironment}"`;
      if (transactionType) {
        kqlFilter += ` AND transaction.type: "${transactionType}"`;
      }
      if (transactionName) {
        kqlFilter += ` AND transaction.name: "${transactionName}"`;
      }
      const buckets = await getTraceChangePoints({
        core,
        plugins,
        request,
        logger,
        start,
        end,
        kqlFilter,
        groupBy: 'transaction.name',
        latencyType: 'p95',
        apmDataSource: undefined,
      });

      const changePoints = buckets.map((bucket) => {
        return {
          key: bucket.key,
          doc_count: bucket.doc_count,
          changes_latency: bucket.changes_latency,
          changes_throughput: bucket.changes_throughput,
          changes_failure_rate: bucket.changes_failure_rate,
        };
      });
      return isEmpty(changePoints) ? null : changePoints;
    },
  },
  {
    key: 'apmExitSpanChangePoints',
    description:
      'sudden shifts in throughput/latency/failure rate of downstream dependencies — shows when problems started',
    startOffsetMinutes: 6 * 60,
    async fetch({ core, plugins, request, logger, serviceName, serviceEnvironment }, start, end) {
      if (!serviceName) return null;

      const { bucketSize, intervalString } = getBucketSize({
        start: datemath.parse(start)!.valueOf(),
        end: datemath.parse(end)!.valueOf(),
        numBuckets: 100,
      });

      const buckets = await getTraceChangePoints({
        core,
        plugins,
        request,
        logger,
        start,
        end,
        kqlFilter: `service.name: "${serviceName}" AND service.environment: "${serviceEnvironment}"`,
        groupBy: SPAN_DESTINATION_SERVICE_RESOURCE,
        latencyType: 'avg',
        apmDataSource: {
          documentType: ApmDocumentType.ServiceDestinationMetric,
          rollupInterval: RollupInterval.OneMinute,
          durationField: SPAN_DURATION,
          bucketSize,
        },
      });
      const changePoints = buckets.map((bucket) => {
        return {
          key: bucket.key,
          doc_count: bucket.doc_count,
          changes_latency: bucket.changes_latency,
          changes_throughput: bucket.changes_throughput,
          changes_failure_rate: bucket.changes_failure_rate,
        };
      });
      return isEmpty(changePoints) ? null : changePoints;
    },
  },
  {
    key: 'apmServiceTopology',
    description:
      'Shows downstream dependencies (services and external dependencies), including metrics for latency/througput/error rate. Useful for understanding if the service is a victim of cascading failures.',
    startOffsetMinutes: 24 * 60,
    async fetch({ core, plugins, dataRegistry, request, logger, serviceName }, start, end) {
      if (!serviceName) return null;
      const data = await getServiceTopology({
        core,
        plugins,
        dataRegistry,
        request,
        logger,
        serviceName,
        direction: 'downstream',
        depth: 1,
        start,
        end,
      });
      return isEmpty(data) ? null : data;
    },
  },
  {
    key: 'logGroups',
    description: 'error messages and exception patterns',
    startOffsetMinutes: 15,
    async fetch({ core, plugins, request, logger, esClient, serviceName, hostName }, start, end) {
      let kqlFilter: string;
      if (serviceName) {
        kqlFilter = `service.name: "${serviceName}"`;
      } else if (hostName) {
        kqlFilter = `host.name: "${hostName}"`;
      } else {
        return null;
      }

      const result = await getLogGroups({
        core,
        plugins,
        request,
        logger,
        esClient,
        start,
        end,
        kqlFilter,
        fields: [],
        includeStackTrace: false,
        includeFirstSeen: false,
        size: 10,
      });
      return result.length > 0 ? result : null;
    },
  },
  {
    key: 'runtimeMetrics',
    description: 'CPU, memory, GC duration, thread count — indicates internal resource pressure',
    startOffsetMinutes: 15,
    async fetch({ core, plugins, request, logger, serviceName, serviceEnvironment }, start, end) {
      if (!serviceName) return null;
      const result = await getRuntimeMetrics({
        core,
        plugins,
        request,
        logger,
        serviceName,
        serviceEnvironment,
        start,
        end,
      });
      return result.nodes.length > 0 ? result.nodes : null;
    },
  },
  {
    key: 'infraHosts',
    description: 'CPU, memory, disk, network usage — indicates host-level resource pressure',
    startOffsetMinutes: 15,
    async fetch({ request, dataRegistry, serviceName, hostName }, start, end) {
      const kqlFilter = hostName
        ? `host.name: "${hostName}"`
        : serviceName
        ? `service.name: "${serviceName}"`
        : null;

      if (!kqlFilter) return null;

      const result = await getHosts({
        request,
        dataRegistry,
        start,
        end,
        limit: 10,
        kqlFilter,
      });

      return result.hosts.length > 0 ? result.hosts : null;
    },
  },
  {
    key: 'servicesOnHost',
    description:
      'for infrastructure alerts, shows services running on the affected host — helps identify which service may be causing resource pressure',
    startOffsetMinutes: 15,
    async fetch(
      { core, plugins, request, esClient, dataRegistry, logger, serviceName, hostName },
      start,
      end
    ) {
      if (!hostName || serviceName) return null;

      const result = await getServices({
        core,
        plugins,
        request,
        esClient,
        dataRegistry,
        logger,
        start,
        end,
        kqlFilter: `host.name: "${hostName}"`,
      });

      return result.services.length > 0 ? result.services : null;
    },
  },
];

export async function runSignalFetchers(
  deps: SignalFetcherDeps,
  alertStart: string
): Promise<SignalResult[]> {
  const results = await Promise.all(
    SIGNAL_FETCHERS.map(async ({ key, description, startOffsetMinutes, fetch }) => {
      try {
        const start = moment(alertStart)
          .clone()
          .subtract(startOffsetMinutes, 'minutes')
          .toISOString();

        const end = alertStart;

        const data = await fetch(deps, start, end);
        return data != null ? { key, description, start, end: alertStart, data } : null;
      } catch (err) {
        deps.logger.debug(`AI insight: ${key} failed: ${err}`);
        return null;
      }
    })
  );

  return compact(results);
}

export function formatSignalResults(results: SignalResult[]): {
  context: string;
  signalDescriptions: string[];
} {
  const contextParts = results.map(
    ({ key, start, end, data }) =>
      `<${key}>\nTime window: ${start} to ${end}\n\`\`\`json\n${JSON.stringify(
        data,
        null,
        2
      )}\n\`\`\`\n</${key}>`
  );

  const signalDescriptions = results.map(({ key, description }) => `- ${key}: ${description}`);

  return {
    context: contextParts.length > 0 ? contextParts.join('\n\n') : 'No related signals available.',
    signalDescriptions,
  };
}
