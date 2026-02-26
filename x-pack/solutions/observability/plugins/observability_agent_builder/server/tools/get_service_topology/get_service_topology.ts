/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { KibanaRequest, Logger } from '@kbn/core/server';
import { uniq } from 'lodash';
import type { ObservabilityAgentBuilderDataRegistry } from '../../data_registry/data_registry';
import type {
  ObservabilityAgentBuilderCoreSetup,
  ObservabilityAgentBuilderPluginSetupDependencies,
} from '../../types';
import { parseDatemath } from '../../utils/time';
import { buildApmResources } from '../../utils/build_apm_resources';
import type { TopologyDirection, ServiceTopologyResponse, ConnectionWithKey } from './types';
import { buildConnectionsFromSpans } from './build_connections_from_spans';
import { getConnectionMetrics, finalizeConnections } from './get_connection_metrics';
import { filterDownstreamConnections, filterUpstreamConnections } from './filter_connections';
import { getTraceIdsFromExitSpansTargetingDependency } from './get_trace_ids_from_exit_spans';
import { getImmediateDownstreamDependencies } from './get_immediate_downstream_dependencies';

interface TopologyResources {
  dataRegistry: ObservabilityAgentBuilderDataRegistry;
  core: ObservabilityAgentBuilderCoreSetup;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  request: KibanaRequest;
  logger: Logger;
}

/**
 * Shared pipeline: fetch exit spans from trace IDs, build connections, filter by direction,
 * and enrich with service_destination metrics.
 */
async function buildTopologyFromTraceIds({
  resources,
  traceIds,
  serviceName,
  startMs,
  endMs,
  maxDepth,
  filterFn,
}: {
  resources: TopologyResources;
  traceIds: string[];
  serviceName: string;
  startMs: number;
  endMs: number;
  maxDepth?: number;
  filterFn: (
    connections: ConnectionWithKey[],
    rootService: string,
    maxDepth?: number
  ) => ConnectionWithKey[];
}): Promise<ServiceTopologyResponse> {
  if (traceIds.length === 0) {
    return { connections: [] };
  }

  const spans = await resources.dataRegistry.getData('apmExitSpanSamples', {
    request: resources.request,
    traceIds,
    start: startMs,
    end: endMs,
  });

  if (!spans) {
    return { connections: [] };
  }

  const filtered = filterFn(buildConnectionsFromSpans(spans), serviceName, maxDepth);

  const serviceNames = uniq(filtered.map((c) => c._sourceName));
  const metricsMap = await getConnectionMetrics({
    dataRegistry: resources.dataRegistry,
    request: resources.request,
    start: startMs,
    end: endMs,
    serviceNames,
  });

  return { connections: finalizeConnections(filtered, metricsMap) };
}

async function getDownstreamTopology({
  resources,
  serviceName,
  startMs,
  endMs,
  maxDepth,
}: {
  resources: TopologyResources;
  serviceName: string;
  startMs: number;
  endMs: number;
  maxDepth?: number;
}): Promise<ServiceTopologyResponse> {
  // Fast path: depth=1 uses pre-aggregated metrics instead of trace scanning
  if (maxDepth === 1) {
    resources.logger.debug(
      `Using aggregated traces to return immediate downstream dependencies of "${serviceName}"`
    );
    return getImmediateDownstreamDependencies({
      dataRegistry: resources.dataRegistry,
      request: resources.request,
      serviceName,
      startMs,
      endMs,
    });
  }

  resources.logger.debug(
    `Using sampled traces to return downstream dependencies of "${serviceName}"`
  );

  const result = await resources.dataRegistry.getData('apmTraceSampleIds', {
    request: resources.request,
    serviceName,
    start: startMs,
    end: endMs,
  });

  const traceIds = result?.traceIds ?? [];

  resources.logger.debug(`Found ${traceIds.length} traces for downstream topology`);

  return buildTopologyFromTraceIds({
    resources,
    traceIds,
    serviceName,
    startMs,
    endMs,
    maxDepth,
    filterFn: filterDownstreamConnections,
  });
}

async function getUpstreamTopology({
  resources,
  serviceName,
  startMs,
  endMs,
  maxDepth,
}: {
  resources: TopologyResources;
  serviceName: string;
  startMs: number;
  endMs: number;
  maxDepth?: number;
}): Promise<ServiceTopologyResponse> {
  // Strategy: First try to find traces via the service's own transactions.
  // If the service has transactions (it's an instrumented service like "checkout-service"),
  // those traces will contain the full call chain including upstream callers.
  // This is reliable — no field matching needed.
  const result = await resources.dataRegistry.getData('apmTraceSampleIds', {
    request: resources.request,
    serviceName,
    start: startMs,
    end: endMs,
  });

  const traceIds = result?.traceIds ?? [];

  if (traceIds.length > 0) {
    resources.logger.debug(
      `Found ${traceIds.length} traces for upstream topology via service transactions`
    );

    return buildTopologyFromTraceIds({
      resources,
      traceIds,
      serviceName,
      startMs,
      endMs,
      maxDepth,
      filterFn: filterUpstreamConnections,
    });
  }

  // Fallback: the service has no transactions, so it's an external dependency (e.g., "postgres").
  // Find traces by exact match on span.destination.service.resource.
  resources.logger.debug(
    `No transactions found for "${serviceName}", falling back to exit span search (external dependency)`
  );

  const { apmEventClient } = await buildApmResources({
    core: resources.core,
    plugins: resources.plugins,
    request: resources.request,
    logger: resources.logger,
  });

  const depTraceIds = await getTraceIdsFromExitSpansTargetingDependency({
    apmEventClient,
    dependencyName: serviceName,
    start: startMs,
    end: endMs,
  });

  resources.logger.debug(`Found ${depTraceIds.length} traces for upstream topology via exit spans`);

  return buildTopologyFromTraceIds({
    resources,
    traceIds: depTraceIds,
    serviceName,
    startMs,
    endMs,
    maxDepth,
    filterFn: filterUpstreamConnections,
  });
}

/**
 * Optimized path for direction === 'both': fetches trace samples and exit spans once,
 * then filters in both directions from the shared connection graph.
 *
 * This avoids duplicate ES queries — getTraceSampleIds and fetchExitSpanSamplesFromTraceIds
 * would otherwise execute identical queries for both downstream and upstream.
 */
async function getBothTopology({
  resources,
  serviceName,
  startMs,
  endMs,
  maxDepth,
}: {
  resources: TopologyResources;
  serviceName: string;
  startMs: number;
  endMs: number;
  maxDepth?: number;
}): Promise<ServiceTopologyResponse> {
  const result = await resources.dataRegistry.getData('apmTraceSampleIds', {
    request: resources.request,
    serviceName,
    start: startMs,
    end: endMs,
  });

  const traceIds = result?.traceIds ?? [];

  // External dependency (no transactions): downstream is empty, only upstream applies.
  // Fall back to finding traces via exit spans targeting this dependency.
  if (traceIds.length === 0) {
    resources.logger.debug(
      `No transactions found for "${serviceName}", falling back to exit span search (external dependency)`
    );

    const { apmEventClient } = await buildApmResources({
      core: resources.core,
      plugins: resources.plugins,
      request: resources.request,
      logger: resources.logger,
    });

    const depTraceIds = await getTraceIdsFromExitSpansTargetingDependency({
      apmEventClient,
      dependencyName: serviceName,
      start: startMs,
      end: endMs,
    });

    resources.logger.debug(
      `Found ${depTraceIds.length} traces for upstream topology via exit spans`
    );

    return buildTopologyFromTraceIds({
      resources,
      traceIds: depTraceIds,
      serviceName,
      startMs,
      endMs,
      maxDepth,
      filterFn: filterUpstreamConnections,
    });
  }

  resources.logger.debug(`Found ${traceIds.length} traces for both-direction topology`);

  // Fetch exit spans once, build connection graph once
  const spans = await resources.dataRegistry.getData('apmExitSpanSamples', {
    request: resources.request,
    traceIds,
    start: startMs,
    end: endMs,
  });

  if (!spans) {
    return { connections: [] };
  }

  const allConnections = buildConnectionsFromSpans(spans);
  const downFiltered = filterDownstreamConnections(allConnections, serviceName, maxDepth);
  const upFiltered = filterUpstreamConnections(allConnections, serviceName, maxDepth);

  // Single metrics query with union of service names from both directions
  const serviceNames = uniq([
    ...downFiltered.map((c) => c._sourceName),
    ...upFiltered.map((c) => c._sourceName),
  ]);

  const metricsMap = await getConnectionMetrics({
    dataRegistry: resources.dataRegistry,
    request: resources.request,
    start: startMs,
    end: endMs,
    serviceNames,
  });

  return {
    connections: [
      ...finalizeConnections(downFiltered, metricsMap),
      ...finalizeConnections(upFiltered, metricsMap),
    ],
  };
}

export async function getServiceTopology({
  core,
  plugins,
  dataRegistry,
  request,
  logger,
  serviceName,
  direction = 'downstream',
  depth,
  start,
  end,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  dataRegistry: ObservabilityAgentBuilderDataRegistry;
  request: KibanaRequest;
  logger: Logger;
  serviceName: string;
  direction?: TopologyDirection;
  depth?: number;
  start: string;
  end: string;
}): Promise<ServiceTopologyResponse> {
  const startMs = parseDatemath(start);
  const endMs = parseDatemath(end);

  const resources: TopologyResources = { dataRegistry, core, plugins, request, logger };
  const params = { resources, serviceName, startMs, endMs, maxDepth: depth };

  if (direction === 'downstream') {
    return getDownstreamTopology(params);
  }

  if (direction === 'upstream') {
    return getUpstreamTopology(params);
  }

  return getBothTopology(params);
}
