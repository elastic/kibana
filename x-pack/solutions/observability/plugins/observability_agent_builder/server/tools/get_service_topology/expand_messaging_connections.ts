/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
import type { ObservabilityAgentBuilderDataRegistry } from '../../data_registry/data_registry';
import type { ConnectionWithKey } from './types';
import { buildConnectionsFromSpans } from './build_connections_from_spans';
import { getTraceIdsFromExitSpansTargetingDependency } from './get_trace_ids_from_exit_spans';

export const MAX_MESSAGING_DEPS_TO_EXPAND = 5;

/**
 * For each messaging dependency, find other services that also connect to it.
 * This reveals the other side of the pipeline (e.g., the producer when we started
 * from a consumer, or vice versa). Only returns connections not already present
 * in existingConnections.
 *
 * Caps expansion to MAX_MESSAGING_DEPS_TO_EXPAND to bound the number of ES queries.
 * Each dependency triggers two queries (trace IDs + exit spans), so this prevents
 * unbounded latency when many messaging topics appear in the topology.
 */
export async function expandMessagingConnections({
  apmEventClient,
  dataRegistry,
  request,
  logger,
  messagingDeps,
  existingConnections,
  startMs,
  endMs,
}: {
  apmEventClient: APMEventClient;
  dataRegistry: ObservabilityAgentBuilderDataRegistry;
  request: KibanaRequest;
  logger: Logger;
  messagingDeps: string[];
  existingConnections: ConnectionWithKey[];
  startMs: number;
  endMs: number;
}): Promise<ConnectionWithKey[]> {
  if (messagingDeps.length === 0) {
    return [];
  }

  const capped = messagingDeps.slice(0, MAX_MESSAGING_DEPS_TO_EXPAND);
  if (capped.length < messagingDeps.length) {
    logger.warn(
      `Capping messaging expansion to ${MAX_MESSAGING_DEPS_TO_EXPAND} of ${messagingDeps.length} dependencies`
    );
  }

  const existingKeys = new Set(existingConnections.map((c) => c._key));

  const perDepResults = await Promise.all(
    capped.map(async (depName) => {
      logger.debug(`Expanding messaging dependency "${depName}" to find other connected services`);

      const depTraceIds = await getTraceIdsFromExitSpansTargetingDependency({
        apmEventClient,
        dependencyName: depName,
        start: startMs,
        end: endMs,
      });

      if (depTraceIds.length === 0) {
        return [];
      }

      const spans = await dataRegistry.getData('apmExitSpanSamples', {
        request,
        traceIds: depTraceIds,
        start: startMs,
        end: endMs,
      });

      if (!spans) {
        return [];
      }

      // Traces may include spans to unrelated resources (DB, HTTP, etc.) - filter to this broker only.
      // Also exclude connections the caller already has (e.g., fraud-detection → kafka/orders).
      const newConnections = buildConnectionsFromSpans(spans).filter(
        (c) => c._dependencyName === depName && !existingKeys.has(c._key)
      );

      logger.debug(
        `Found ${newConnections.length} additional connections to messaging dependency "${depName}"`
      );

      return newConnections;
    })
  );

  return perDepResults.flat();
}
