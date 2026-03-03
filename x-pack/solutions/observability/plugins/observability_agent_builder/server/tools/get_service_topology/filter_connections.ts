/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SERVICE_NAME } from '@kbn/apm-types';
import type { ConnectionWithKey } from './types';

/**
 * Filters connections to only include those that are downstream (descendants) of the root service.
 * This performs a graph traversal starting from the root service, following outgoing edges.
 *
 * For example, given connections: A→B, B→C, A→D, X→Y
 * filterDownstreamConnections(connections, 'A') returns: A→B, B→C, A→D
 * (excludes X→Y because X is not reachable from A)
 *
 * This excludes sibling dependencies - services called by ancestors but not by the queried service
 * or its descendants.
 */
export function filterDownstreamConnections(
  connections: ConnectionWithKey[],
  rootServiceName: string,
  maxDepth?: number
): ConnectionWithKey[] {
  // Build adjacency list: source -> list of connections from that source
  const adjacencyMap = new Map<string, ConnectionWithKey[]>();
  for (const conn of connections) {
    const existing = adjacencyMap.get(conn._sourceName) ?? [];
    existing.push(conn);
    adjacencyMap.set(conn._sourceName, existing);
  }

  // BFS traversal starting from rootServiceName
  const visitedServices = new Set<string>();
  const results: ConnectionWithKey[] = [];
  const queue: Array<{ serviceName: string; depth: number }> = [
    { serviceName: rootServiceName, depth: 0 },
  ];

  while (queue.length > 0) {
    const { serviceName: currentService, depth: currentDepth } = queue.shift()!;

    // Skip already-visited nodes to avoid cycles
    if (!visitedServices.has(currentService)) {
      visitedServices.add(currentService);

      // Get all connections from this service
      const outgoingConnections = adjacencyMap.get(currentService) ?? [];

      for (const conn of outgoingConnections) {
        results.push(conn);

        // If target is a service (not external dependency), add to queue for further traversal
        const target = conn.target;
        if (SERVICE_NAME in target) {
          const targetServiceName = target[SERVICE_NAME];
          if (
            !visitedServices.has(targetServiceName) &&
            (maxDepth === undefined || currentDepth + 1 < maxDepth)
          ) {
            queue.push({ serviceName: targetServiceName, depth: currentDepth + 1 });
          }
        }
      }
    }
  }

  return results;
}

/**
 * Filters connections to only include those that are upstream (ancestors) of the root service.
 * This performs a reverse graph traversal starting from the root service, following incoming edges.
 *
 * For example, given connections: A→B, B→C, C→D, X→Y
 * filterUpstreamConnections(connections, 'D') returns: A→B, B→C, C→D
 * (excludes X→Y because it doesn't lead to D)
 *
 * This excludes sibling dependencies - services that don't eventually call the queried service.
 *
 * IMPORTANT: Graph traversal relies on resolved `target['service.name']` for service-to-service
 * edges. We do NOT use heuristic matching on `span.destination.service.resource` because that
 * field can contain arbitrary values (proxy hostnames, IP addresses, load balancer names, etc.)
 * that don't necessarily relate to the downstream service name. For the root node only, we also
 * check exact `_dependencyName` match to handle external dependencies (e.g., "postgres").
 */
export function filterUpstreamConnections(
  connections: ConnectionWithKey[],
  rootServiceName: string,
  maxDepth?: number
): ConnectionWithKey[] {
  // Build reverse adjacency lists:
  // 1. By resolved service name (target['service.name']) - reliable for graph traversal
  // 2. By exact dependency name (span.destination.service.resource) - only for root node lookup
  const reverseAdjacencyByService = new Map<string, ConnectionWithKey[]>();
  const reverseAdjacencyByDep = new Map<string, ConnectionWithKey[]>();

  for (const conn of connections) {
    // Add to service name map if the target is a resolved service
    if (SERVICE_NAME in conn.target) {
      const targetServiceName = conn.target[SERVICE_NAME];
      const existing = reverseAdjacencyByService.get(targetServiceName) ?? [];
      existing.push(conn);
      reverseAdjacencyByService.set(targetServiceName, existing);
    }

    // Add to dependency name map (exact key)
    const depName = conn._dependencyName;
    const existingByDep = reverseAdjacencyByDep.get(depName) ?? [];
    existingByDep.push(conn);
    reverseAdjacencyByDep.set(depName, existingByDep);
  }

  // BFS traversal starting from the root service, going backwards through callers
  const visitedServices = new Set<string>();
  const visitedEdges = new Set<string>();
  const results: ConnectionWithKey[] = [];
  const queue: Array<{ serviceName: string; depth: number }> = [
    { serviceName: rootServiceName, depth: 0 },
  ];

  while (queue.length > 0) {
    const { serviceName: currentService, depth: currentDepth } = queue.shift()!;

    if (!visitedServices.has(currentService)) {
      visitedServices.add(currentService);

      // Find connections where target['service.name'] matches (resolved service-to-service edges)
      const connsByService = reverseAdjacencyByService.get(currentService) ?? [];

      // For the root node only, also find connections by exact dependency name.
      // This handles external dependencies like "postgres" where the user queries by the
      // resource name and there is no resolved target['service.name'].
      const connsByDep =
        currentService === rootServiceName ? reverseAdjacencyByDep.get(currentService) ?? [] : [];

      // Process both sets of connections, deduplicating by edge key
      for (const conn of [...connsByService, ...connsByDep]) {
        if (!visitedEdges.has(conn._key)) {
          visitedEdges.add(conn._key);
          results.push(conn);

          const sourceName = conn._sourceName;
          if (
            !visitedServices.has(sourceName) &&
            (maxDepth === undefined || currentDepth + 1 < maxDepth)
          ) {
            queue.push({ serviceName: sourceName, depth: currentDepth + 1 });
          }
        }
      }
    }
  }

  return results;
}
